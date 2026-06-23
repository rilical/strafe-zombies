// level.js — Nacht-der-Untoten faithful map data (pure, no logic).
//
// Layout: 16×16 donut — four rooms around a solid 6×6 central core.
//
//  ┌──────────────────────────────────────────────────────┐
//  │  border (type 1)                                     │
//  │   ┌── Room A ──┐  north passage  ┌── Room B ──┐     │
//  │   │ Main Hall  │  (always open)  │ Side Room  │     │
//  │   └────────────┘                 └────────────┘     │
//  │  west corridor   ┌──── CORE ────┐  east corridor   │
//  │  (A↔D, open)     │  type 2 wall │  (B↔C, open)    │
//  │                  └──────────────┘                   │
//  │   ┌── Room D ──┐  ╔═ DEBRIS ═╗  ┌── Room C ──┐    │
//  │   │  Storage   │  ║cost 1000 ║  │ Help Room  │    │
//  │   └────────────┘  ╚══════════╝  └────────────┘    │
//  │  border (type 1)                                    │
//  └─────────────────────────────────────────────────────┘
//
// Grid values: 0 = empty/walkable, 1 = wall, 2 = core wall (heavy),
//              3 = debris (buyable; solid until barriers.openDoor clears it).
//
// World units = map cells; cell (cx,cy) has centre (cx+0.5, cy+0.5).
// Angles are radians; dir = (cos θ, sin θ). Matches engine.js conventions.
//
// Connectivity without debris:
//   A ↔ B (north passage), A ↔ D (west corridor), B ↔ C (east corridor).
//   C and D are NOT directly connected — debris blocks the south passage.
//
// Connectivity after buying debris (opensRoom 'd'):
//   A ↔ B ↔ C ↔ D ↔ A  — full clockwise lap for zombie training.

// Base grid. Row index = y, column index = x (row-major).
// Debris cells (type 3) are treated as solid walls by the engine and pathfind;
// barriers.js tracks which have been cleared in the mutable world overlay.
const grid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // y=0  top border
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // y=1  north passage (A+B+N-corridor)
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // y=2
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // y=3
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // y=4
  [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1], // y=5  core top + W/E corridors
  [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1], // y=6
  [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1], // y=7
  [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1], // y=8
  [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1], // y=9
  [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1], // y=10 core bottom
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1], // y=11 south door-frame (wall)
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1], // y=12 south debris (cost 1000)
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1], // y=13 south debris
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1], // y=14 south door-frame (wall)
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // y=15 bottom border
];

export const LEVEL = {
  grid,
  W: grid[0].length, // 16
  H: grid.length,    // 16

  // Player spawns in Room A (Main Hall), facing east (angle 0 = (cos 0, sin 0) = east).
  spawn: { x: 2.5, y: 2.5, angle: 0 },

  // Four rooms — ids are referenced by windows and are the barrier/pathfind room keys.
  rooms: [
    { id: "a", name: "Main Hall"  }, // NW — spawn room
    { id: "b", name: "Side Room"  }, // NE
    { id: "c", name: "Help Room"  }, // SE — Mystery Box is here
    { id: "d", name: "Storage"    }, // SW — opens to the lap when debris is bought
  ],

  // Boarded windows — cx,cy is the border wall cell through which zombies enter.
  // faceX/faceY is the inward unit direction (toward the walkable room interior).
  // barriers.js manages the per-window board count in the mutable world overlay.
  windows: [
    { id: "w1", cx:  2, cy:  0, room: "a", faceX:  0, faceY:  1 }, // Main Hall, top wall
    { id: "w2", cx:  0, cy:  3, room: "a", faceX:  1, faceY:  0 }, // Main Hall, left wall
    { id: "w3", cx: 13, cy:  0, room: "b", faceX:  0, faceY:  1 }, // Side Room, top wall
    { id: "w4", cx: 15, cy:  2, room: "b", faceX: -1, faceY:  0 }, // Side Room, right wall
    { id: "w5", cx: 15, cy: 12, room: "c", faceX: -1, faceY:  0 }, // Help Room, right wall
    { id: "w6", cx:  0, cy: 12, room: "d", faceX:  1, faceY:  0 }, // Storage, left wall
  ],

  // Wall-gun buy spots — cx,cy is the core or divider wall cell.
  // faceX/faceY points toward the player (the walkable cell they stand in to buy).
  mounts: [
    { id: "m1", weaponId: "kar98k",    cost:  200, cx:  5, cy:  7, faceX: -1, faceY:  0 }, // west corridor
    { id: "m2", weaponId: "m1carbine", cost:  600, cx:  7, cy:  5, faceX:  0, faceY: -1 }, // north passage
    { id: "m3", weaponId: "thompson",  cost: 1200, cx: 10, cy:  8, faceX:  1, faceY:  0 }, // east corridor
  ],

  // Mystery Box location — Help Room (C). Integration rolls the weapon each use.
  box: { cx: 13, cy: 12 },

  // Perk-a-Cola machines — one per room, positioned against inner walls.
  // The integration agent shows a buy prompt when the player is adjacent.
  perkMachines: [
    { id: "perk-juggernog", perkId: "juggernog", cost: 2500, cx:  2, cy:  3 }, // Room A
    { id: "perk-speedcola", perkId: "speedcola", cost: 3000, cx: 12, cy:  3 }, // Room B
    { id: "perk-doubletap", perkId: "doubletap", cost: 2000, cx:  3, cy: 12 }, // Room D
  ],

  // Debris doors — cells are solid (type 3) in the base grid.
  // barriers.openDoor(world, id) clears them in the world overlay.
  // opensRoom tells the integration which room's windows to activate.
  debris: [
    {
      id: "debris-south",
      cost: 1000,
      // Two cells wide × two cells tall at the south corridor (y=12,13; x=7,8)
      cells: [[7, 12], [8, 12], [7, 13], [8, 13]],
      opensRoom: "d", // Storage becomes loop-connected; Room D windows activate
    },
  ],
};

// cellAt — look up a base-grid value by integer cell coordinates.
// Returns 1 (solid) for any out-of-bounds read so callers don't need
// bounds checks (mirrors engine.js wallAt convention).
export function cellAt(level, cx, cy) {
  if (cy < 0 || cy >= level.H || cx < 0 || cx >= level.W) return 1;
  return level.grid[cy][cx];
}
