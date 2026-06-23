import { describe, it, expect } from "vitest";
import { shootRay, resolveShot, applyDamage, scoreForHit } from "../src/shooting.js";

const CORRIDOR_MAP = [
  [1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1],
];

const OCCLUDED_MAP = [
  [1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1],
];

const OPEN_ROOM_MAP = [
  [1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1],
];

describe("shootRay — hitscan target selection", () => {
  it("returns the nearest zombie whose body intersects the ray before a wall", () => {
    const near = { id: "near", x: 2.8, y: 1.5, hp: 40 };
    const far = { id: "far", x: 4.2, y: 1.5, hp: 40 };

    const hit = shootRay(CORRIDOR_MAP, 1.5, 1.5, 1, 0, [far, near]);

    expect(hit.zombie).toBe(near);
    expect(hit.t).toBeCloseTo(0.9, 6);
  });

  it("returns null when a wall occludes the zombie body", () => {
    const zombie = { id: "hidden", x: 3.5, y: 1.5, hp: 40 };

    expect(shootRay(OCCLUDED_MAP, 1.5, 1.5, 1, 0, [zombie])).toBeNull();
  });

  it("returns null when the ray misses every zombie body", () => {
    const zombie = { id: "missed", x: 3.0, y: 2.2, hp: 40 };

    expect(shootRay(OPEN_ROOM_MAP, 1.5, 1.5, 1, 0, [zombie])).toBeNull();
  });
});

describe("damage and scoring", () => {
  it("applies damage immutably and floors hp at zero", () => {
    const zombie = { id: "z1", x: 2.5, y: 1.5, hp: 25, state: "shamble" };

    const damaged = applyDamage(zombie, 40);

    expect(damaged).toEqual({ id: "z1", x: 2.5, y: 1.5, hp: 0, state: "shamble" });
    expect(damaged).not.toBe(zombie);
    expect(zombie.hp).toBe(25);
  });

  it("scores regular hits and kills with the frozen economy values", () => {
    const zombie = { id: "z1", x: 2.5, y: 1.5, hp: 25 };

    expect(scoreForHit(zombie, false)).toBe(10);
    expect(scoreForHit(zombie, true)).toBe(60);
  });
});

describe("resolveShot — immutable shot resolution", () => {
  it("damages the ray-selected zombie and reports kill score plus killedId", () => {
    const player = { x: 1.5, y: 1.5, angle: 0 };
    const near = { id: "near", x: 2.8, y: 1.5, hp: 35 };
    const far = { id: "far", x: 4.2, y: 1.5, hp: 80 };
    const zombies = [far, near];
    const weapon = { damage: 40 };

    const result = resolveShot(CORRIDOR_MAP, player, zombies, weapon);

    expect(result.scoreDelta).toBe(60);
    expect(result.killedId).toBe("near");
    expect(result.zombies).not.toBe(zombies);
    expect(result.zombies[0]).toBe(far);
    expect(result.zombies[1]).toEqual({ id: "near", x: 2.8, y: 1.5, hp: 0 });
    expect(result.zombies[1]).not.toBe(near);
    expect(near.hp).toBe(35);
  });

  it("returns an immutable no-op result when the shot misses", () => {
    const player = { x: 1.5, y: 1.5, angle: 0 };
    const zombies = [{ id: "missed", x: 3.0, y: 2.2, hp: 40 }];

    const result = resolveShot(OPEN_ROOM_MAP, player, zombies, { damage: 40 });

    expect(result).toEqual({ zombies, scoreDelta: 0, killedId: null });
    expect(result.zombies).not.toBe(zombies);
    expect(result.zombies[0]).toBe(zombies[0]);
  });
});
