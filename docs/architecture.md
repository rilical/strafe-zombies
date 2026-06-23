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
│  engine.js   MAP, castRay (DDA), collision, walkability   │
│  game.js*    stepZombie, spawnWave, damage, hitscan ...    │
│  (* added feature by feature, each test-first)            │
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
- `MAP`, `MAP_W`, `MAP_H` — the level grid (0 = empty, 1/2/3 = wall types).
- `wallAt(map, x, y)` — wall lookup; out-of-bounds is solid.
- `castRay(map, posX, posY, rayDirX, rayDirY)` — DDA raycast returning
  `{ perpWallDist, side, mapX, mapY, wall }`. `perpWallDist` is perpendicular to avoid
  fisheye.
- `isWalkable`, `moveWithCollision` — per-axis collision so entities slide along walls.

### `src/game.js`
- `stepZombie(map, zombie, target, dt, speed)` — advances one zombie toward the target
  by `speed * dt` units, sliding along walls via `moveWithCollision`. Pure: returns a new
  entity and never mutates its input. This is the seed of the chase AI; future gameplay
  (spawning, damage, shooting) lands here as more pure, tested functions.

### `index.html`
- Owns player state, the input map, the rAF loop, and all drawing.
- Calls only pure functions from `src/`; holds no game *rules* itself beyond wiring.

## Conventions

- Angles in radians; `dir = (cos θ, sin θ)`. The camera plane is perpendicular to `dir`,
  scaled by `FOV`.
- World units are map cells; the player radius is ~0.18 cells.
- New gameplay = a new pure function in `src/` (test-first) + a few lines of wiring in
  `index.html`.
