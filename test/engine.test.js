import { describe, it, expect } from "vitest";
import { MAP, castRay, isWalkable, moveWithCollision } from "../src/engine.js";

describe("castRay — distances from the player at (1.5, 1.5)", () => {
  it("east ray hits the pillar (type 2) at perpendicular distance 7.5", () => {
    const east = castRay(MAP, 1.5, 1.5, 1, 0);
    expect(east.perpWallDist).toBeCloseTo(7.5, 6);
    expect(east.wall).toBe(2);
  });

  it("west ray hits the border at 0.5", () => {
    expect(castRay(MAP, 1.5, 1.5, -1, 0).perpWallDist).toBeCloseTo(0.5, 6);
  });

  it("north ray hits the top border at 0.5", () => {
    expect(castRay(MAP, 1.5, 1.5, 0, -1).perpWallDist).toBeCloseTo(0.5, 6);
  });

  it("south ray hits the bottom border at 13.5", () => {
    expect(castRay(MAP, 1.5, 1.5, 0, 1).perpWallDist).toBeCloseTo(13.5, 6);
  });
});

describe("castRay — interior walls", () => {
  it("hits the '3' block at distance 1.5 on an EW face", () => {
    const interior = castRay(MAP, 1.5, 4.5, 1, 0);
    expect(interior.perpWallDist).toBeCloseTo(1.5, 6);
    expect(interior.side).toBe(0);
    expect(interior.wall).toBe(3);
  });
});

describe("collision + walkability", () => {
  it("treats open interior cells as walkable and walls as not", () => {
    expect(isWalkable(MAP, 1.5, 1.5)).toBe(true);
    expect(isWalkable(MAP, 0.5, 0.5)).toBe(false);
  });

  it("blocks movement into a wall on the X axis", () => {
    const blocked = moveWithCollision(MAP, 1.2, 1.5, -0.5, 0);
    expect(blocked.x).toBe(1.2);
  });

  it("allows free movement into open space", () => {
    const moved = moveWithCollision(MAP, 1.5, 1.5, 0.3, 0);
    expect(moved.x).toBeCloseTo(1.8, 6);
  });
});
