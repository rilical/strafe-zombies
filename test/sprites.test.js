import { describe, it, expect } from "vitest";
import { projectSprite, projectSprites } from "../src/sprites.js";
import { MAP, castRay } from "../src/engine.js";

// Camera conventions match src/engine.js:
//   dir   = (cos angle, sin angle)
//   plane = (-dirY, dirX) * FOV     // +plane is screen-right
// A modest FOV and a small canvas keep the expected arithmetic obvious.
const FOV = 0.66;
const W = 320; // screen centre is W/2 = 160
const H = 200; // horizon is H/2 = 100

const player = (x, y, angle = 0) => ({ x, y, angle });

describe("projectSprite — a sprite dead ahead", () => {
  it("projects to screen centre with depth = straight-line distance", () => {
    // Facing +x from (2,2); the sprite is 3 cells straight ahead.
    const p = projectSprite(player(2, 2, 0), FOV, W, H, { x: 5, y: 2 });
    expect(p.visible).toBe(true);
    expect(p.screenX).toBeCloseTo(W / 2, 6);
    expect(p.depth).toBeCloseTo(3, 6);
  });

  it("uses the player's facing angle (dead ahead when facing +y)", () => {
    // Rotated 90°: forward is now +y, so a sprite at +y is centred.
    const p = projectSprite(player(2, 2, Math.PI / 2), FOV, W, H, { x: 2, y: 5 });
    expect(p.visible).toBe(true);
    expect(p.screenX).toBeCloseTo(W / 2, 6);
    expect(p.depth).toBeCloseTo(3, 6);
  });
});

describe("projectSprite — depth is the forward (perpendicular) distance", () => {
  it("uses the camera-axis projection, not the raw euclidean distance", () => {
    // Sprite is 3 ahead and 2 to the side: forward distance is 3, not √13.
    // This is the fisheye-free 'perpWallDist'-comparable value castRay returns.
    const p = projectSprite(player(2, 2, 0), FOV, W, H, { x: 5, y: 4 });
    expect(p.depth).toBeCloseTo(3, 6);
    expect(p.depth).toBeLessThan(Math.hypot(3, 2)); // < euclidean √13 ≈ 3.606
  });
});

describe("projectSprite — depth is comparable to castRay's perpWallDist", () => {
  // The renderer occludes a sprite column where its depth >= the wall's
  // perpWallDist in that column, so the two distances must be on the same
  // scale. Cast straight at a wall from the engine's reference player and
  // check a sprite sitting on the hit point reports the identical depth.
  it("equals perpWallDist for a sprite on the wall along the view axis", () => {
    const wall = castRay(MAP, 1.5, 1.5, 1, 0); // east ray → pillar at 7.5 (engine.test.js)
    expect(wall.perpWallDist).toBeCloseTo(7.5, 6);
    const onWall = projectSprite(player(1.5, 1.5, 0), FOV, W, H, {
      x: 1.5 + wall.perpWallDist,
      y: 1.5,
    });
    expect(onWall.depth).toBeCloseTo(wall.perpWallDist, 6);
  });

  it("reads farther than the wall when behind it, nearer when in front", () => {
    const wall = castRay(MAP, 1.5, 1.5, 1, 0).perpWallDist;
    const behindWall = projectSprite(player(1.5, 1.5, 0), FOV, W, H, { x: 1.5 + wall + 1, y: 1.5 });
    const beforeWall = projectSprite(player(1.5, 1.5, 0), FOV, W, H, { x: 1.5 + wall - 1, y: 1.5 });
    expect(behindWall.depth).toBeGreaterThan(wall); // occluded by the wall buffer
    expect(beforeWall.depth).toBeLessThan(wall);    // drawn over the wall
  });
});

describe("projectSprite — scale shrinks with distance", () => {
  it("is inversely proportional to depth (closer ⇒ bigger)", () => {
    const near = projectSprite(player(2, 2, 0), FOV, W, H, { x: 4, y: 2 }); // depth 2
    const far = projectSprite(player(2, 2, 0), FOV, W, H, { x: 6, y: 2 });  // depth 4
    expect(near.scale).toBeCloseTo(H / 2, 6); // 100
    expect(far.scale).toBeCloseTo(H / 4, 6);  // 50
    expect(near.scale).toBeGreaterThan(far.scale);
    expect(near.scale).toBeCloseTo(far.scale * 2, 6);
  });
});

describe("projectSprite — horizontal placement", () => {
  it("puts a sprite on the facing's right side right of centre", () => {
    // Facing +x, +plane is +y, so a sprite offset to +y appears screen-right.
    const right = projectSprite(player(2, 2, 0), FOV, W, H, { x: 5, y: 4 });
    expect(right.screenX).toBeGreaterThan(W / 2);
  });

  it("puts a sprite on the facing's left side left of centre", () => {
    const left = projectSprite(player(2, 2, 0), FOV, W, H, { x: 5, y: 0 });
    expect(left.screenX).toBeLessThan(W / 2);
  });

  it("is symmetric about centre for mirror-image offsets", () => {
    const right = projectSprite(player(2, 2, 0), FOV, W, H, { x: 5, y: 4 });
    const left = projectSprite(player(2, 2, 0), FOV, W, H, { x: 5, y: 0 });
    expect(right.screenX - W / 2).toBeCloseTo(W / 2 - left.screenX, 6);
  });
});

describe("projectSprite — behind the camera", () => {
  it("reports visible:false for a sprite directly behind", () => {
    // Facing +x from (5,5); the sprite is 3 cells behind (−x).
    const p = projectSprite(player(5, 5, 0), FOV, W, H, { x: 2, y: 5 });
    expect(p.visible).toBe(false);
    expect(p.depth).toBeLessThan(0);
  });

  it("reports visible:false for a sprite at the camera position (degenerate)", () => {
    const p = projectSprite(player(3, 3, 0), FOV, W, H, { x: 3, y: 3 });
    expect(p.visible).toBe(false);
  });
});

describe("projectSprite — vertical draw band", () => {
  it("frames a band centred on the horizon, height = scale", () => {
    const p = projectSprite(player(2, 2, 0), FOV, W, H, { x: 6, y: 2 }); // depth 4, scale 50
    expect(p.drawStartY).toBeCloseTo(H / 2 - p.scale / 2, 6); // 75
    expect(p.drawEndY).toBeCloseTo(H / 2 + p.scale / 2, 6);   // 125
    expect(p.drawEndY - p.drawStartY).toBeCloseTo(p.scale, 6);
    expect((p.drawStartY + p.drawEndY) / 2).toBeCloseTo(H / 2, 6);
  });

  it("clamps the band to the screen for a very close sprite", () => {
    const p = projectSprite(player(2, 2, 0), FOV, W, H, { x: 2.5, y: 2 }); // depth 0.5, scale 400
    expect(p.scale).toBeCloseTo(H / 0.5, 6); // 400, taller than the screen
    expect(p.drawStartY).toBe(0);
    expect(p.drawEndY).toBe(H);
  });
});

describe("projectSprites — culls and z-sorts", () => {
  const p = player(2, 2, 0);
  const A = { x: 4, y: 2, tag: "A" }; // depth 2
  const B = { x: 8, y: 2, tag: "B" }; // depth 6
  const C = { x: 6, y: 2, tag: "C" }; // depth 4
  const behind = { x: 1, y: 2, tag: "behind" }; // depth −1

  it("drops behind-camera sprites and returns the rest", () => {
    const out = projectSprites(p, FOV, W, H, [A, B, C, behind]);
    expect(out).toHaveLength(3);
    expect(out.every((s) => s.visible)).toBe(true);
  });

  it("orders results far → near (painter's algorithm)", () => {
    const out = projectSprites(p, FOV, W, H, [A, B, C, behind]);
    // Explicit far → near depths: B(6) → C(4) → A(2); nearest is drawn last.
    expect(out[0].depth).toBeCloseTo(6, 6);
    expect(out[1].depth).toBeCloseTo(4, 6);
    expect(out[2].depth).toBeCloseTo(2, 6);
    // Strictly decreasing — a near→far regression fails here instead of slipping by.
    expect(out[0].depth).toBeGreaterThan(out[1].depth);
    expect(out[1].depth).toBeGreaterThan(out[2].depth);
  });

  it("attaches each source sprite so the renderer can map projections back", () => {
    const out = projectSprites(p, FOV, W, H, [A, B, C, behind]);
    expect(out.map((s) => s.sprite)).toEqual([B, C, A]);
  });
});

describe("purity — inputs are never mutated", () => {
  it("does not mutate a frozen player, sprite, or sprites array", () => {
    const frozenPlayer = Object.freeze(player(2, 2, 0));
    const frozenSprite = Object.freeze({ x: 5, y: 2 });
    const frozenList = Object.freeze([
      Object.freeze({ x: 4, y: 2 }),
      Object.freeze({ x: 8, y: 2 }),
    ]);
    expect(() => projectSprite(frozenPlayer, FOV, W, H, frozenSprite)).not.toThrow();
    expect(() => projectSprites(frozenPlayer, FOV, W, H, frozenList)).not.toThrow();
    // The returned projections reference the original (frozen) sprite objects.
    const out = projectSprites(frozenPlayer, FOV, W, H, frozenList);
    expect(out.every((s) => frozenList.includes(s.sprite))).toBe(true);
  });
});
