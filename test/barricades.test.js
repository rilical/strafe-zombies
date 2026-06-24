import { describe, expect, it } from "vitest";
import {
  TEAR_SECS,
  MAX_BOARDS,
  REPAIR_REWARD,
  REACH,
  windowPoints,
  pickWindow,
  tickBreak,
  findRepairableWindow,
} from "../src/barricades.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A minimal window on each of the four cardinal faces. */
const WIN_EAST  = { id: "e", cx: 3, cy: 2, room: "r", faceX:  1, faceY:  0 };
const WIN_WEST  = { id: "w", cx: 3, cy: 2, room: "r", faceX: -1, faceY:  0 };
const WIN_SOUTH = { id: "s", cx: 2, cy: 1, room: "r", faceX:  0, faceY:  1 };
const WIN_NORTH = { id: "n", cx: 2, cy: 3, room: "r", faceX:  0, faceY: -1 };

function makeWorld(entries) {
  // entries: [[id, boards], ...]
  const windows = {};
  for (const [id, boards] of entries) windows[id] = boards;
  return { doors: {}, windows };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("module constants", () => {
  it("TEAR_SECS is 1.2", () => expect(TEAR_SECS).toBe(1.2));
  it("MAX_BOARDS is 6", () => expect(MAX_BOARDS).toBe(6));
  it("REPAIR_REWARD is 10", () => expect(REPAIR_REWARD).toBe(10));
  it("REACH is 1.6", () => expect(REACH).toBe(1.6));
});

// ---------------------------------------------------------------------------
// windowPoints
// ---------------------------------------------------------------------------

describe("windowPoints", () => {
  it("face EAST (1,0): inside is east of wall, outside is west", () => {
    const pts = windowPoints(WIN_EAST);
    // inside = (cx + faceX + 0.5, cy + faceY + 0.5) = (4.5, 2.5)
    expect(pts.inside.x).toBeCloseTo(4.5);
    expect(pts.inside.y).toBeCloseTo(2.5);
    // outside = (cx - faceX + 0.5, cy - faceY + 0.5) = (2.5, 2.5)
    expect(pts.outside.x).toBeCloseTo(2.5);
    expect(pts.outside.y).toBeCloseTo(2.5);
  });

  it("face WEST (-1,0): inside is west of wall, outside is east", () => {
    const pts = windowPoints(WIN_WEST);
    // inside = (3 + -1 + 0.5, 2 + 0 + 0.5) = (2.5, 2.5)
    expect(pts.inside.x).toBeCloseTo(2.5);
    expect(pts.inside.y).toBeCloseTo(2.5);
    // outside = (3 - -1 + 0.5, 2 - 0 + 0.5) = (4.5, 2.5)
    expect(pts.outside.x).toBeCloseTo(4.5);
    expect(pts.outside.y).toBeCloseTo(2.5);
  });

  it("face SOUTH (0,1): inside is south of wall, outside is north", () => {
    const pts = windowPoints(WIN_SOUTH);
    // inside = (2 + 0 + 0.5, 1 + 1 + 0.5) = (2.5, 2.5)
    expect(pts.inside.x).toBeCloseTo(2.5);
    expect(pts.inside.y).toBeCloseTo(2.5);
    // outside = (2 - 0 + 0.5, 1 - 1 + 0.5) = (2.5, 0.5)
    expect(pts.outside.x).toBeCloseTo(2.5);
    expect(pts.outside.y).toBeCloseTo(0.5);
  });

  it("face NORTH (0,-1): inside is north of wall, outside is south", () => {
    const pts = windowPoints(WIN_NORTH);
    // inside = (2 + 0 + 0.5, 3 + -1 + 0.5) = (2.5, 2.5)
    expect(pts.inside.x).toBeCloseTo(2.5);
    expect(pts.inside.y).toBeCloseTo(2.5);
    // outside = (2 - 0 + 0.5, 3 - -1 + 0.5) = (2.5, 4.5)
    expect(pts.outside.x).toBeCloseTo(2.5);
    expect(pts.outside.y).toBeCloseTo(4.5);
  });

  it("does not mutate the input window", () => {
    const win = { ...WIN_EAST };
    const before = { ...win };
    windowPoints(win);
    expect(win).toEqual(before);
  });

  it("returns two distinct point objects", () => {
    const pts = windowPoints(WIN_EAST);
    expect(pts.inside).not.toBe(pts.outside);
  });
});

// ---------------------------------------------------------------------------
// pickWindow
// ---------------------------------------------------------------------------

describe("pickWindow", () => {
  it("returns null for an empty array", () => {
    const world = makeWorld([]);
    expect(pickWindow([], world)).toBeNull();
  });

  it("prefers boarded windows over open ones", () => {
    const wins = [
      { id: "open1", cx: 0, cy: 0, faceX: 1, faceY: 0 },
      { id: "open2", cx: 1, cy: 0, faceX: 1, faceY: 0 },
      { id: "board", cx: 2, cy: 0, faceX: 1, faceY: 0 },
    ];
    const world = makeWorld([["open1", 0], ["open2", 0], ["board", 3]]);
    // Whatever rng returns, only "board" qualifies
    const result = pickWindow(wins, world, () => 0);
    expect(result.id).toBe("board");
  });

  it("picks uniformly from boarded windows via stubbed rng", () => {
    const wins = [
      { id: "a", cx: 0, cy: 0, faceX: 1, faceY: 0 },
      { id: "b", cx: 1, cy: 0, faceX: 1, faceY: 0 },
      { id: "c", cx: 2, cy: 0, faceX: 1, faceY: 0 },
    ];
    const world = makeWorld([["a", 6], ["b", 4], ["c", 2]]);
    // rng = 0 → floor(0 * 3) = 0 → "a"
    expect(pickWindow(wins, world, () => 0).id).toBe("a");
    // rng = 0.5 → floor(0.5 * 3) = 1 → "b"
    expect(pickWindow(wins, world, () => 0.5).id).toBe("b");
    // rng = 0.99 → floor(0.99 * 3) = 2 → "c"
    expect(pickWindow(wins, world, () => 0.99).id).toBe("c");
  });

  it("falls back to all windows when every board count is 0", () => {
    const wins = [
      { id: "a", cx: 0, cy: 0, faceX: 1, faceY: 0 },
      { id: "b", cx: 1, cy: 0, faceX: 1, faceY: 0 },
    ];
    const world = makeWorld([["a", 0], ["b", 0]]);
    expect(pickWindow(wins, world, () => 0).id).toBe("a");
    expect(pickWindow(wins, world, () => 0.99).id).toBe("b");
  });

  it("does not mutate the windows array or world", () => {
    const wins = [{ id: "a", cx: 0, cy: 0, faceX: 1, faceY: 0 }];
    const world = makeWorld([["a", 3]]);
    const winsBefore = JSON.stringify(wins);
    const worldBefore = JSON.stringify(world);
    pickWindow(wins, world);
    expect(JSON.stringify(wins)).toBe(winsBefore);
    expect(JSON.stringify(world)).toBe(worldBefore);
  });

  it("handles a single window correctly", () => {
    const wins = [{ id: "solo", cx: 5, cy: 5, faceX: 0, faceY: 1 }];
    const world = makeWorld([["solo", 6]]);
    expect(pickWindow(wins, world, () => 0).id).toBe("solo");
    expect(pickWindow(wins, world, () => 0.999).id).toBe("solo");
  });
});

// ---------------------------------------------------------------------------
// tickBreak
// ---------------------------------------------------------------------------

describe("tickBreak", () => {
  it("pops nothing when dt is less than tearSecs", () => {
    const result = tickBreak(0, 4, 1.0);
    expect(result.tears).toBe(0);
    expect(result.broken).toBe(false);
    expect(result.tearTimer).toBeCloseTo(1.0);
  });

  it("pops nothing when timer accumulates but stays below threshold", () => {
    // Two small ticks that together don't reach TEAR_SECS
    const r1 = tickBreak(0, 4, 0.6);
    const r2 = tickBreak(r1.tearTimer, 4, 0.5);
    expect(r2.tears).toBe(0);
    expect(r2.broken).toBe(false);
    expect(r2.tearTimer).toBeCloseTo(1.1);
  });

  it("pops exactly one plank at the boundary (dt = TEAR_SECS)", () => {
    const result = tickBreak(0, 4, TEAR_SECS);
    expect(result.tears).toBe(1);
    expect(result.broken).toBe(false);
    expect(result.tearTimer).toBeCloseTo(0);
  });

  it("pops multiple planks for a large dt", () => {
    // 3 × TEAR_SECS should pop 3 planks
    const result = tickBreak(0, 6, TEAR_SECS * 3);
    expect(result.tears).toBe(3);
    expect(result.broken).toBe(false);
    expect(result.tearTimer).toBeCloseTo(0);
  });

  it("sets broken true when boards reach 0", () => {
    const result = tickBreak(0, 1, TEAR_SECS);
    expect(result.tears).toBe(1);
    expect(result.broken).toBe(true);
    expect(result.tearTimer).toBe(0);
  });

  it("sets broken true even if dt overshoots", () => {
    const result = tickBreak(0, 2, TEAR_SECS * 5);
    expect(result.tears).toBe(2);
    expect(result.broken).toBe(true);
    expect(result.tearTimer).toBe(0);
  });

  it("treats an already-open window (boards=0) as broken immediately", () => {
    // PR#27 P1: pickWindow can hand back an already-open window. A caller that spawns a
    // breaking zombie there and waits for `broken` before chasing must not hang, so boards=0
    // reports broken at once — nothing to pop, timer cleared.
    const result = tickBreak(0, 0, TEAR_SECS * 3);
    expect(result.tears).toBe(0);
    expect(result.broken).toBe(true);
    expect(result.tearTimer).toBe(0);
  });

  it("carries leftover time forward", () => {
    // 1.5 × TEAR_SECS should pop 1 plank and leave 0.5 × TEAR_SECS on the clock
    const dt = TEAR_SECS * 1.5;
    const result = tickBreak(0, 4, dt);
    expect(result.tears).toBe(1);
    expect(result.tearTimer).toBeCloseTo(TEAR_SECS * 0.5);
  });

  it("honours a custom tearSecs parameter", () => {
    const result = tickBreak(0, 4, 2.0, 1.0);
    expect(result.tears).toBe(2);
    expect(result.tearTimer).toBeCloseTo(0);
  });

  it("accumulated timer from a prior tick carries into next pop", () => {
    // Two ticks of 0.7 s with TEAR_SECS=1.2: first gives 0 tears (0.7 < 1.2),
    // second gives 1 tear (0.7+0.7=1.4 >= 1.2), leftover = 0.2
    const r1 = tickBreak(0, 4, 0.7);
    expect(r1.tears).toBe(0);
    const r2 = tickBreak(r1.tearTimer, 4, 0.7);
    expect(r2.tears).toBe(1);
    expect(r2.tearTimer).toBeCloseTo(0.2);
  });

  it("does not mutate any input", () => {
    // boards is a primitive; tearTimer is a primitive — no mutation possible,
    // but confirm the returned object is a fresh one
    const result = tickBreak(0.5, 3, 0.3);
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findRepairableWindow
// ---------------------------------------------------------------------------

describe("findRepairableWindow", () => {
  /** Build a minimal level with a windows array. */
  function makeLevel(windows) {
    return { windows };
  }

  it("returns null when level.windows is empty", () => {
    const level = makeLevel([]);
    const world = makeWorld([]);
    const player = { x: 5, y: 5 };
    expect(findRepairableWindow(level, world, player)).toBeNull();
  });

  it("returns null when all windows are at MAX_BOARDS", () => {
    const wins = [{ id: "a", cx: 5, cy: 5, faceX: 1, faceY: 0 }];
    const level = makeLevel(wins);
    const world = makeWorld([["a", MAX_BOARDS]]);
    const player = { x: 5.5, y: 5.5 }; // right on top of cell centre
    expect(findRepairableWindow(level, world, player)).toBeNull();
  });

  it("returns null when the only repairable window is out of reach", () => {
    const wins = [{ id: "a", cx: 10, cy: 10, faceX: 1, faceY: 0 }];
    const level = makeLevel(wins);
    const world = makeWorld([["a", 3]]);
    const player = { x: 1, y: 1 }; // far away
    expect(findRepairableWindow(level, world, player)).toBeNull();
  });

  it("returns the repairable window when in reach", () => {
    const wins = [{ id: "a", cx: 5, cy: 5, faceX: 1, faceY: 0 }];
    const level = makeLevel(wins);
    const world = makeWorld([["a", 3]]);
    // Cell centre is (5.5, 5.5); player is 1.0 cells away → within REACH=1.6
    const player = { x: 5.5, y: 6.5 };
    expect(findRepairableWindow(level, world, player).id).toBe("a");
  });

  it("picks the nearest under-boarded window among several in reach", () => {
    const wins = [
      { id: "far",  cx: 5, cy: 5, faceX: 1, faceY: 0 },  // centre (5.5, 5.5)
      { id: "near", cx: 5, cy: 6, faceX: 1, faceY: 0 },  // centre (5.5, 6.5)
    ];
    const level = makeLevel(wins);
    const world = makeWorld([["far", 4], ["near", 2]]);
    // Player at (5.5, 7) — closer to "near" (dist 0.5) than to "far" (dist 1.5)
    const player = { x: 5.5, y: 7 };
    expect(findRepairableWindow(level, world, player).id).toBe("near");
  });

  it("ignores fully-boarded windows even if nearest", () => {
    const wins = [
      { id: "full",   cx: 5, cy: 5, faceX: 1, faceY: 0 }, // boards = MAX
      { id: "broken", cx: 5, cy: 6, faceX: 1, faceY: 0 }, // boards = 3
    ];
    const level = makeLevel(wins);
    const world = makeWorld([["full", MAX_BOARDS], ["broken", 3]]);
    const player = { x: 5.5, y: 5.5 }; // same position as "full" centre
    expect(findRepairableWindow(level, world, player).id).toBe("broken");
  });

  it("does not mutate level, world, or player", () => {
    const wins = [{ id: "a", cx: 5, cy: 5, faceX: 1, faceY: 0 }];
    const level = makeLevel(wins);
    const world = makeWorld([["a", 3]]);
    const player = { x: 5.5, y: 5.5 };
    const levelBefore  = JSON.stringify(level);
    const worldBefore  = JSON.stringify(world);
    const playerBefore = JSON.stringify(player);
    findRepairableWindow(level, world, player);
    expect(JSON.stringify(level)).toBe(levelBefore);
    expect(JSON.stringify(world)).toBe(worldBefore);
    expect(JSON.stringify(player)).toBe(playerBefore);
  });

  it("the boundary case: player exactly at REACH distance qualifies", () => {
    const wins = [{ id: "a", cx: 5, cy: 5, faceX: 1, faceY: 0 }];
    const level = makeLevel(wins);
    const world = makeWorld([["a", 3]]);
    // Centre is (5.5, 5.5). Place player exactly REACH cells away horizontally.
    const player = { x: 5.5 + REACH, y: 5.5 };
    expect(findRepairableWindow(level, world, player).id).toBe("a");
  });

  it("the boundary case: player just beyond REACH distance does not qualify", () => {
    const wins = [{ id: "a", cx: 5, cy: 5, faceX: 1, faceY: 0 }];
    const level = makeLevel(wins);
    const world = makeWorld([["a", 3]]);
    const player = { x: 5.5 + REACH + 0.001, y: 5.5 };
    expect(findRepairableWindow(level, world, player)).toBeNull();
  });
});
