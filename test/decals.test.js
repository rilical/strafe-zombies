import { describe, it, expect } from "vitest";
import {
  addDecal,
  tickDecals,
  projectWallDecal,
  projectFloorDecal,
} from "../src/decals.js";

// Camera conventions mirror src/sprites.js:
//   dir   = (cos angle, sin angle)
//   plane = (-dirY, dirX) * FOV
// These dimensions keep the hand-computed projection cases readable.
const FOV = 0.66;
const W = 320;
const H = 200;

const player = (x, y, angle = 0) => ({ x, y, angle });

describe("addDecal", () => {
  it("appends a decal and evicts the oldest entry when the cap is exceeded", () => {
    const oldest = Object.freeze({ id: "oldest", x: 1, y: 1, kind: "bullet" });
    const kept = Object.freeze({ id: "kept", x: 2, y: 1, kind: "blood" });
    const next = Object.freeze({ id: "next", x: 3, y: 1, kind: "bullet" });
    const list = Object.freeze([oldest, kept]);

    const out = addDecal(list, next, 2);

    expect(out).toEqual([kept, next]);
    expect(out).not.toBe(list);
    expect(list).toEqual([oldest, kept]);
  });
});

describe("tickDecals", () => {
  it("ages finite decals, exposes fade, culls elapsed ttl, and keeps Infinity ttl entries", () => {
    const finite = Object.freeze({ id: "finite", x: 1, y: 1, kind: "blood", age: 0.25, ttl: 1 });
    const expired = Object.freeze({ id: "expired", x: 2, y: 1, kind: "blood", age: 0.8, ttl: 1 });
    const forever = Object.freeze({ id: "forever", x: 3, y: 1, kind: "bullet", age: 100, ttl: Infinity });
    const list = Object.freeze([finite, expired, forever]);

    const out = tickDecals(list, 0.25);

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: "finite", age: 0.5, fade: 0.5 });
    expect(out[1]).toMatchObject({ id: "forever", age: 100.25, ttl: Infinity, fade: 1 });
    expect(out[0]).not.toBe(finite);
    expect(out[1]).not.toBe(forever);
    expect(list).toEqual([finite, expired, forever]);
  });
});

describe("projectWallDecal", () => {
  it("matches the hand-computed inverse-camera projection used by sprites", () => {
    // Facing +x from (2,2); the decal is 3 cells forward and 1 cell screen-right.
    // plane=(0,0.66), invDet=-1/0.66, transformX=1/0.66, depth=3.
    const p = projectWallDecal(player(2, 2, 0), FOV, W, H, { x: 5, y: 3, kind: "bullet" });

    expect(p.visible).toBe(true);
    expect(p.depth).toBeCloseTo(3, 6);
    expect(p.screenX).toBeCloseTo((W / 2) * (1 + (1 / FOV) / 3), 6);
    expect(p.screenY).toBeCloseTo(H / 2, 6);
    expect(p.scale).toBeCloseTo(H / 3, 6);
  });

  it("reports visible:false for a wall decal behind the camera", () => {
    const p = projectWallDecal(player(2, 2, 0), FOV, W, H, { x: 1, y: 2, kind: "bullet" });

    expect(p.visible).toBe(false);
    expect(p.depth).toBeLessThan(0);
    expect(Number.isNaN(p.screenX)).toBe(true);
    expect(Number.isNaN(p.screenY)).toBe(true);
    expect(p.scale).toBe(0);
  });
});

describe("projectFloorDecal", () => {
  it("projects a ground point to its floor-cast row", () => {
    // At depth 4 on the centre ray, Lode-style floor casting gives:
    // row = horizon + (H / 2) / depth = 100 + 25 = 125.
    const p = projectFloorDecal(player(2, 2, 0), FOV, W, H, { x: 6, y: 2, kind: "blood" });

    expect(p.visible).toBe(true);
    expect(p.depth).toBeCloseTo(4, 6);
    expect(p.screenX).toBeCloseTo(W / 2, 6);
    expect(p.screenY).toBeCloseTo(H / 2 + H / (2 * 4), 6);
    expect(p.scale).toBeCloseTo(H / 4, 6);
  });

  it("reports visible:false for a floor decal behind the camera", () => {
    const p = projectFloorDecal(player(2, 2, 0), FOV, W, H, { x: 1, y: 2, kind: "blood" });

    expect(p.visible).toBe(false);
    expect(p.depth).toBeLessThan(0);
    expect(Number.isNaN(p.screenX)).toBe(true);
    expect(Number.isNaN(p.screenY)).toBe(true);
    expect(p.scale).toBe(0);
  });
});

describe("purity and determinism", () => {
  it("does not mutate frozen projection inputs", () => {
    const frozenPlayer = Object.freeze(player(2, 2, Math.PI / 2));
    const frozenWall = Object.freeze({ x: 2, y: 5, kind: "bullet" });
    const frozenFloor = Object.freeze({ x: 2, y: 6, kind: "blood" });

    expect(() => projectWallDecal(frozenPlayer, FOV, W, H, frozenWall)).not.toThrow();
    expect(() => projectFloorDecal(frozenPlayer, FOV, W, H, frozenFloor)).not.toThrow();
    expect(frozenWall).toEqual({ x: 2, y: 5, kind: "bullet" });
    expect(frozenFloor).toEqual({ x: 2, y: 6, kind: "blood" });
  });

  it("returns the same result for the same inputs without randomness or time", () => {
    const decals = Object.freeze([
      Object.freeze({ id: "a", x: 4, y: 2, kind: "bullet", age: 0.1, ttl: 2 }),
      Object.freeze({ id: "b", x: 5, y: 2, kind: "blood", age: 0.2, ttl: 3 }),
    ]);
    const p = Object.freeze(player(2, 2, 0));
    const wall = Object.freeze({ x: 5, y: 3, kind: "bullet" });
    const floor = Object.freeze({ x: 6, y: 2, kind: "blood" });

    expect(addDecal(decals, wall, 3)).toEqual(addDecal(decals, wall, 3));
    expect(tickDecals(decals, 0.5)).toEqual(tickDecals(decals, 0.5));
    expect(projectWallDecal(p, FOV, W, H, wall)).toEqual(projectWallDecal(p, FOV, W, H, wall));
    expect(projectFloorDecal(p, FOV, W, H, floor)).toEqual(projectFloorDecal(p, FOV, W, H, floor));
  });
});
