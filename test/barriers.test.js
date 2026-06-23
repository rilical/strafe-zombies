import { describe, expect, it } from "vitest";
import {
  createWorld,
  openDoor,
  repairBoard,
  tearBoard,
  isBlocked,
} from "../src/barriers.js";

const LEVEL = {
  grid: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  W: 5,
  H: 5,
  spawn: { x: 1.5, y: 1.5, angle: 0 },
  rooms: [
    { id: "start", name: "Start" },
    { id: "hall", name: "Hall" },
  ],
  windows: [
    { id: "win-a", cx: 1, cy: 2, room: "start", faceX: 1, faceY: 0 },
    { id: "win-b", cx: 3, cy: 2, room: "hall", faceX: -1, faceY: 0 },
  ],
  mounts: [],
  box: { cx: 1, cy: 3 },
  perkMachines: [],
  debris: [
    { id: "door-a", cost: 1000, cells: [[2, 2]], opensRoom: "hall" },
    { id: "door-b", cost: 1000, cells: [[3, 3]], opensRoom: "hall" },
  ],
};

describe("barriers world state", () => {
  it("createWorld initializes all doors closed and all windows at 6 boards", () => {
    expect(createWorld(LEVEL)).toEqual({
      doors: { "door-a": false, "door-b": false },
      windows: { "win-a": 6, "win-b": 6 },
    });
  });

  it("openDoor opens a door immutably", () => {
    const world = createWorld(LEVEL);
    const next = openDoor(world, "door-a");

    expect(next).not.toBe(world);
    expect(next.doors).not.toBe(world.doors);
    expect(next.windows).toBe(world.windows);
    expect(next.doors["door-a"]).toBe(true);
    expect(next.doors["door-b"]).toBe(false);
    expect(world.doors["door-a"]).toBe(false);
  });

  it("tearBoard and repairBoard clamp boards to [0, 6] and are immutable", () => {
    const world = createWorld(LEVEL);

    const afterOneTear = tearBoard(world, "win-a");
    expect(afterOneTear.windows["win-a"]).toBe(5);
    expect(world.windows["win-a"]).toBe(6);

    let allTorn = world;
    for (let i = 0; i < 10; i += 1) {
      allTorn = tearBoard(allTorn, "win-a");
    }
    expect(allTorn.windows["win-a"]).toBe(0);

    let fullyRepaired = allTorn;
    for (let i = 0; i < 10; i += 1) {
      fullyRepaired = repairBoard(fullyRepaired, "win-a");
    }
    expect(fullyRepaired.windows["win-a"]).toBe(6);
    expect(fullyRepaired).not.toBe(allTorn);
    expect(fullyRepaired.windows).not.toBe(allTorn.windows);
  });
});

describe("isBlocked", () => {
  it("blocks walls, blocked debris cells, and out-of-bounds cells", () => {
    const world = createWorld(LEVEL);

    expect(isBlocked(LEVEL, world, 0, 0)).toBe(true);
    expect(isBlocked(LEVEL, world, 2, 2)).toBe(true);
    expect(isBlocked(LEVEL, world, -1, 2)).toBe(true);
    expect(isBlocked(LEVEL, world, 2, -1)).toBe(true);
    expect(isBlocked(LEVEL, world, LEVEL.W, 2)).toBe(true);
    expect(isBlocked(LEVEL, world, 2, LEVEL.H)).toBe(true);
  });

  it("allows open floor cells and opened debris door cells", () => {
    const world = createWorld(LEVEL);
    const withOpenDoor = openDoor(world, "door-a");

    expect(isBlocked(LEVEL, world, 1, 1)).toBe(false);
    expect(isBlocked(LEVEL, withOpenDoor, 2, 2)).toBe(false);
  });
});
