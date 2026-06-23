import { describe, it, expect } from "vitest";
import { LEVEL, cellAt } from "../src/level.js";

// ---------------------------------------------------------------------------
// level.js exports LEVEL (static map data) and cellAt (lookup helper).
// Tests mirror the frozen contract in docs/agents/README.md — if any test
// here fails, the contract is broken and barriers / pathfind will break too.
// ---------------------------------------------------------------------------

describe("LEVEL — shape contract", () => {
  it("exports LEVEL with all required top-level fields", () => {
    expect(LEVEL).toBeDefined();
    expect(Array.isArray(LEVEL.grid)).toBe(true);
    expect(typeof LEVEL.W).toBe("number");
    expect(typeof LEVEL.H).toBe("number");
    expect(LEVEL.spawn).toBeDefined();
    expect(Array.isArray(LEVEL.rooms)).toBe(true);
    expect(Array.isArray(LEVEL.windows)).toBe(true);
    expect(Array.isArray(LEVEL.mounts)).toBe(true);
    expect(LEVEL.box).toBeDefined();
    expect(Array.isArray(LEVEL.perkMachines)).toBe(true);
    expect(Array.isArray(LEVEL.debris)).toBe(true);
  });

  it("W and H equal the grid dimensions", () => {
    expect(LEVEL.H).toBe(LEVEL.grid.length);
    expect(LEVEL.W).toBe(LEVEL.grid[0].length);
  });

  it("grid is 16×16", () => {
    expect(LEVEL.W).toBe(16);
    expect(LEVEL.H).toBe(16);
    for (const row of LEVEL.grid) {
      expect(row).toHaveLength(16);
    }
  });
});

describe("LEVEL — grid structure", () => {
  it("every cell value is 0, 1, 2, or 3", () => {
    for (const row of LEVEL.grid) {
      for (const v of row) {
        expect([0, 1, 2, 3]).toContain(v);
      }
    }
  });

  it("entire top and bottom border rows are solid (non-zero)", () => {
    const { grid, W, H } = LEVEL;
    for (let x = 0; x < W; x++) {
      expect(grid[0][x], `top row col ${x}`).toBeGreaterThan(0);
      expect(grid[H - 1][x], `bottom row col ${x}`).toBeGreaterThan(0);
    }
  });

  it("entire left and right border columns are solid (non-zero)", () => {
    const { grid, H } = LEVEL;
    for (let y = 0; y < H; y++) {
      expect(grid[y][0], `left col row ${y}`).toBeGreaterThan(0);
      expect(grid[y][LEVEL.W - 1], `right col row ${y}`).toBeGreaterThan(0);
    }
  });
});

describe("LEVEL — spawn", () => {
  it("has numeric x, y, and angle", () => {
    const { spawn } = LEVEL;
    expect(typeof spawn.x).toBe("number");
    expect(typeof spawn.y).toBe("number");
    expect(typeof spawn.angle).toBe("number");
  });

  it("spawn cell is walkable (grid value 0)", () => {
    const { spawn, grid } = LEVEL;
    const cx = Math.floor(spawn.x);
    const cy = Math.floor(spawn.y);
    expect(grid[cy][cx]).toBe(0);
  });
});

// Helper: returns true iff (cx,cy) has at least one 4-neighbour with value 0.
function hasWalkableNeighbour(grid, cx, cy) {
  const H = grid.length, W = grid[0].length;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const nx = cx + dx, ny = cy + dy;
    return nx >= 0 && nx < W && ny >= 0 && ny < H && grid[ny][nx] === 0;
  });
}

describe("LEVEL — windows (6 total)", () => {
  it("has exactly 6 windows", () => {
    expect(LEVEL.windows).toHaveLength(6);
  });

  it("all window ids are unique", () => {
    const ids = LEVEL.windows.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each window cell is adjacent to a walkable cell", () => {
    for (const w of LEVEL.windows) {
      expect(
        hasWalkableNeighbour(LEVEL.grid, w.cx, w.cy),
        `window ${w.id} at (${w.cx},${w.cy})`
      ).toBe(true);
    }
  });

  it("each window has room, faceX, and faceY", () => {
    for (const w of LEVEL.windows) {
      expect(typeof w.room, `window ${w.id} room`).toBe("string");
      expect(typeof w.faceX, `window ${w.id} faceX`).toBe("number");
      expect(typeof w.faceY, `window ${w.id} faceY`).toBe("number");
    }
  });

  it("window room ids reference rooms that exist in LEVEL.rooms", () => {
    const roomIds = new Set(LEVEL.rooms.map((r) => r.id));
    for (const w of LEVEL.windows) {
      expect(roomIds.has(w.room), `window ${w.id} room '${w.room}'`).toBe(true);
    }
  });
});

describe("LEVEL — mounts (3 total)", () => {
  it("has exactly 3 wall-gun mounts", () => {
    expect(LEVEL.mounts).toHaveLength(3);
  });

  it("all mount ids are unique", () => {
    const ids = LEVEL.mounts.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each mount cell is a wall (non-zero) adjacent to a walkable cell", () => {
    const { grid } = LEVEL;
    for (const m of LEVEL.mounts) {
      expect(grid[m.cy][m.cx], `mount ${m.id} cell should be solid`).toBeGreaterThan(0);
      expect(
        hasWalkableNeighbour(grid, m.cx, m.cy),
        `mount ${m.id} at (${m.cx},${m.cy})`
      ).toBe(true);
    }
  });

  it("each mount has weaponId, cost, faceX, faceY", () => {
    for (const m of LEVEL.mounts) {
      expect(typeof m.weaponId).toBe("string");
      expect(typeof m.cost).toBe("number");
      expect(typeof m.faceX).toBe("number");
      expect(typeof m.faceY).toBe("number");
    }
  });
});

describe("LEVEL — Mystery Box (1 total)", () => {
  it("has a box with numeric cx and cy", () => {
    expect(typeof LEVEL.box.cx).toBe("number");
    expect(typeof LEVEL.box.cy).toBe("number");
  });

  it("box cell is adjacent to a walkable cell", () => {
    expect(
      hasWalkableNeighbour(LEVEL.grid, LEVEL.box.cx, LEVEL.box.cy)
    ).toBe(true);
  });
});

describe("LEVEL — perkMachines (3 total)", () => {
  it("has exactly 3 perk machines", () => {
    expect(LEVEL.perkMachines).toHaveLength(3);
  });

  it("all perk machine ids are unique", () => {
    const ids = LEVEL.perkMachines.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each perk machine cell is adjacent to a walkable cell", () => {
    for (const p of LEVEL.perkMachines) {
      expect(
        hasWalkableNeighbour(LEVEL.grid, p.cx, p.cy),
        `perkMachine ${p.id} at (${p.cx},${p.cy})`
      ).toBe(true);
    }
  });

  it("each perk machine has id, perkId, and cost", () => {
    for (const p of LEVEL.perkMachines) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.perkId).toBe("string");
      expect(typeof p.cost).toBe("number");
    }
  });
});

describe("LEVEL — debris (at least 1, with cost-1000 door)", () => {
  it("has at least one debris entry", () => {
    expect(LEVEL.debris.length).toBeGreaterThanOrEqual(1);
  });

  it("contains a debris door costing exactly 1000", () => {
    expect(LEVEL.debris.some((d) => d.cost === 1000)).toBe(true);
  });

  it("all debris ids are unique", () => {
    const ids = LEVEL.debris.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each debris.cells entry is currently solid in the base grid", () => {
    for (const d of LEVEL.debris) {
      for (const [x, y] of d.cells) {
        expect(
          LEVEL.grid[y][x],
          `debris ${d.id} cell (${x},${y})`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("each debris entry has id, cost, cells array, and opensRoom string", () => {
    for (const d of LEVEL.debris) {
      expect(typeof d.id).toBe("string");
      expect(typeof d.cost).toBe("number");
      expect(Array.isArray(d.cells)).toBe(true);
      expect(d.cells.length).toBeGreaterThan(0);
      expect(typeof d.opensRoom).toBe("string");
    }
  });
});

describe("LEVEL — rooms (exactly 4)", () => {
  it("has exactly 4 rooms", () => {
    expect(LEVEL.rooms).toHaveLength(4);
  });

  it("all room ids are unique", () => {
    const ids = LEVEL.rooms.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each room has id and name strings", () => {
    for (const r of LEVEL.rooms) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.name).toBe("string");
    }
  });
});

describe("cellAt helper", () => {
  it("returns the grid value at (cx, cy)", () => {
    expect(cellAt(LEVEL, 0, 0)).toBe(1); // top-left corner = border
    expect(cellAt(LEVEL, 2, 2)).toBe(0); // Room A interior
    expect(cellAt(LEVEL, 7, 7)).toBe(2); // solid core
  });

  it("returns 1 (solid) for out-of-bounds coordinates", () => {
    expect(cellAt(LEVEL, -1, 0)).toBe(1);
    expect(cellAt(LEVEL, 0, -1)).toBe(1);
    expect(cellAt(LEVEL, 100, 100)).toBe(1);
    expect(cellAt(LEVEL, 16, 8)).toBe(1);
  });
});
