# Architecture

The guiding split: **pure logic is testable and lives in `src/`; rendering and input
glue is thin and lives in `index.html`.** Anything you'd want to unit-test belongs in
`src/`.

```
┌─────────────────────────────────────────────────────────┐
│ index.html  (the only place with DOM / canvas / input)   │
│                                                           │
│  requestAnimationFrame loop:                              │
│    update(dt) ── reads keys, calls pure src/ functions    │
│    render()  ── draws walls (raycast) + sprites + HUD      │
└───────────────┬───────────────────────────────────────────┘
                │ imports (ES modules)
                ▼
┌─────────────────────────────────────────────────────────┐
│ src/ — pure, dependency-free, unit-tested                 │
│                                                           │
│  engine.js   castRay (DDA), collision, walkability        │
│  level.js · barriers.js   map data, doors & windows       │
│  rounds.js · pathfind.js   wave pacing, flow-field nav    │
│  shooting · survival · economy · weapons · sprites · …    │
└─────────────────────────────────────────────────────────┘
                ▲
                │ imported by
┌─────────────────────────────────────────────────────────┐
│ test/ — vitest specs for everything in src/               │
└─────────────────────────────────────────────────────────┘
```

## Why this shape

- **Testability.** `castRay` and the game rules are deterministic functions of their
  inputs. They can be verified in milliseconds in Node, with no browser, no canvas, no
  flakiness. That is what makes real TDD practical here.
- **Reviewability.** Logic changes show up as small diffs in focused modules. Rendering
  changes stay out of the logic files.
- **Reuse.** Player and zombies share `moveWithCollision`. New mechanics compose from
  the same pure primitives.

## Current modules

### `src/engine.js`
- `MAP`, `MAP_W`, `MAP_H` — the original demo grid. The **playable Nacht map now lives in
  `src/level.js`** as `LEVEL` (see below); `index.html` renders and collides against
  `LEVEL.grid`, while `engine.MAP` remains only as a small standalone fixture.
- `wallAt(map, x, y)` — wall lookup; out-of-bounds is solid.
- `castRay(map, posX, posY, rayDirX, rayDirY)` — DDA raycast returning
  `{ perpWallDist, side, mapX, mapY, wall }`. `perpWallDist` is perpendicular to avoid
  fisheye.
- `isWalkable`, `moveWithCollision` — per-axis collision so entities slide along walls.

### `src/level.js`, `src/barriers.js`, `src/rounds.js`, `src/pathfind.js`
The Nacht survival systems, each pure and unit-tested (frozen contracts in
[`agents/`](agents/)):
- `level.js` — `LEVEL`: the 16×16 four-room loop map (grid, spawn, windows, wall-gun
  mounts, debris doors, the Mystery Box, perk machines) plus `cellAt`.
- `barriers.js` — the mutable world overlay: `createWorld`, `openDoor`, board repair/tear,
  and `isBlocked(level, world, cx, cy)` (a bought debris door overrides its solid-rubble
  grid value and becomes passable).
- `rounds.js` — faithful escalation math (`zombiesForRound`/HP/speed/cadence/cap) and the
  spawn state machine (`createSpawnState` → `tickSpawner` → `advanceRound`).
- `pathfind.js` — a BFS **flow field** (`buildFlowField`, `flowDir`, `stepZombieAlong`) the
  zombies follow around the core. This **supersedes the original straight-line `stepZombie`**
  (the retired `src/game.js`); `index.html` rebuilds the field when the player changes cell.

### `index.html`
- Owns player state, the input map, the rAF loop, and all drawing.
- Calls only pure functions from `src/`; holds no game *rules* itself beyond wiring.

## Conventions

- Angles in radians; `dir = (cos θ, sin θ)`. The camera plane is perpendicular to `dir`,
  scaled by `FOV`.
- World units are map cells; the player radius is ~0.18 cells.
- New gameplay = a new pure function in `src/` (test-first) + a few lines of wiring in
  `index.html`.
