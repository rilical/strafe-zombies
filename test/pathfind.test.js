import { describe, it, expect } from "vitest";
import { buildFlowField, flowDir, stepZombieAlong } from "../src/pathfind.js";

function idx(W, col, row) {
  return row * W + col;
}

function makeLevel(W, H) {
  return { W, H };
}

function makeIsBlocked(W, H, blockedCells = []) {
  const blocked = new Set(blockedCells.map(([cx, cy]) => `${cx},${cy}`));
  return (_level, _world, cx, cy) =>
    cx < 0 || cy < 0 || cx >= W || cy >= H || blocked.has(`${cx},${cy}`);
}

describe("buildFlowField — distances downhill to the player cell", () => {
  it("builds 4-neighbour BFS distances and marks blocked/unreachable cells with a sentinel", () => {
    const level = makeLevel(5, 5);
    const world = { doors: {}, windows: {} };
    const isBlocked = makeIsBlocked(5, 5, [
      [2, 1],
      [3, 4],
      [4, 3]
    ]);

    const field = buildFlowField(level, world, 1, 1, isBlocked);

    expect(field).toBeInstanceOf(Int8Array);
    expect(field).toHaveLength(25);
    expect(field[idx(5, 1, 1)]).toBe(0);
    expect(field[idx(5, 1, 2)]).toBe(1);
    expect(field[idx(5, 1, 3)]).toBe(2);
    expect(field[idx(5, 3, 1)]).toBe(4);
    expect(field[idx(5, 2, 1)]).toBe(-1); // blocked
    expect(field[idx(5, 4, 4)]).toBe(-1); // unreachable
  });
});

describe("flowDir — downhill neighbour step", () => {
  it("points toward a neighbour with lower distance", () => {
    const level = makeLevel(5, 5);
    const world = { doors: {}, windows: {} };
    const isBlocked = makeIsBlocked(5, 5, [[2, 1]]);
    const field = buildFlowField(level, world, 1, 1, isBlocked);

    expect(flowDir(field, 5, 1, 3)).toEqual({ dx: 0, dy: -1 });
  });

  it("returns a zero vector at the player cell", () => {
    const level = makeLevel(5, 5);
    const world = { doors: {}, windows: {} };
    const isBlocked = makeIsBlocked(5, 5, []);
    const field = buildFlowField(level, world, 1, 1, isBlocked);

    expect(flowDir(field, 5, 1, 1)).toEqual({ dx: 0, dy: 0 });
  });
});

describe("stepZombieAlong — flow-field movement with wall-slide", () => {
  it("moves a zombie closer to the player without mutating the input entity", () => {
    const level = makeLevel(5, 5);
    const world = { doors: {}, windows: {} };
    const isBlocked = makeIsBlocked(5, 5, []);
    const field = buildFlowField(level, world, 1, 1, isBlocked);
    const zombie = { id: "z1", x: 3.5, y: 1.5, hp: 3, state: "walk" };

    const before = Math.hypot(zombie.x - 1.5, zombie.y - 1.5);
    const next = stepZombieAlong(level, world, zombie, field, 1, 1, isBlocked);
    const after = Math.hypot(next.x - 1.5, next.y - 1.5);

    expect(after).toBeLessThan(before);
    expect(next).not.toBe(zombie);
    expect(zombie.x).toBe(3.5);
    expect(zombie.y).toBe(1.5);
  });

  it("slides along a wall when one movement axis is blocked", () => {
    const level = makeLevel(5, 5);
    const world = { doors: {}, windows: {} };
    const isBlocked = (_level, _world, cx, cy) =>
      cx < 0 || cy < 0 || cx >= 5 || cy >= 5 || cx === 0;
    const field = buildFlowField(level, world, 1, 1, isBlocked);
    const zombie = { id: "z2", x: 1.95, y: 3.2, hp: 3 };

    const next = stepZombieAlong(level, world, zombie, field, 1, 2, isBlocked);

    expect(next.x).toBeCloseTo(1.95, 6); // blocked on x by the wall at column 0
    expect(next.y).toBeLessThan(3.2); // still advances on y (slide)
  });
});
