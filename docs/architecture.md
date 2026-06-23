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
  `src/level.js`** as `LEVEL` (see below); `index.html` renders and collides against a
  mutable per-game copy of `LEVEL.grid` (`dynMap`) so a bought debris door can be zeroed
  open, while `engine.MAP` remains only as a small standalone fixture.
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

### Economy & buying — `economy.js`, `weapons.js`, `perks.js`, `interact.js`
The points-and-purchase chain. Each is pure and unit-tested; `index.html` only sequences them:
- `economy.js` — `earn`/`spend(player, cost) → { ok, player }` (the affordability gate) plus
  `pointsForHit`/`pointsForKill`.
- `weapons.js` — the `WEAPONS` data table and `buyWallWeapon`/`rollMysteryBox` (grant + equip
  at full ammo; **neither charges** — wiring composes `economy.spend` first).
- `perks.js` — `PERKS` and `grantPerk` + the `effective*` stat multipliers: Juggernog raises
  the HP cap (`effectiveMaxHp`), Speed Cola shortens reloads (`effectiveReloadMs`), Double Tap
  raises fire rate (`effectiveRpm`). `weapons.fire`/`startReload` take optional `{rpm}`/
  `{reloadMs}` overrides so `index.html` can feed these in without the table changing.
- `interact.js` — `findInteractable(level, world, player)` returns the nearest in-reach buyable
  (mount / box / perk / debris) so `index.html` stays rule-free. It hides already-open doors
  and owned perks, which is why `LEVEL.perkMachines` perkIds and `LEVEL.mounts` weaponIds must
  match the canonical ids in `perks.js`/`weapons.js`.

`index.html` wires these to the **F key**: `tryBuy` calls `findInteractable`, gates on
`spend`, then dispatches by kind (buy the wall gun / roll the box / pour the perk / open the
door + zero its `dynMap` cells and force a flow-field rebuild). The HUD shows the nearest
buyable as a prompt, greyed when unaffordable.

### Power-ups — `powerups.js`
The classic on-kill drops. Pure and unit-tested; `index.html` sequences them:
- `maybeDrop(zombie, rng)` — rolls the ~3% on-kill chance and returns a floor drop (`{type, x,
  y, ttl}`) or `null`. Called at the shot-kill seam.
- `tickPowerUps(state, dt)` — ages floor-drop lifetimes and counts down the active timed
  effects (clamped at 0) without mutating state.
- `applyNuke(zombies) → { zombies, points }` — removes the living and awards a flat bonus.
- `applyMaxAmmo(player)` — refills every owned weapon's mag + reserve.
- `activate(active, type, secs)` — starts/refreshes a timed effect (Insta-Kill / Double Points).

`index.html` pushes a drop on kill, ticks the drops each frame, and collects one when the
player walks within `PICKUP_RANGE`, routing it to the helper above. Insta-Kill overrides the
shot's damage so any hit is lethal; Double Points doubles every award; drops render as hovering
colour-coded diamonds and active timers tick down in the HUD.

### `index.html`
- Owns player state, the input map, the rAF loop, and all drawing.
- Calls only pure functions from `src/`; holds no game *rules* itself beyond wiring.

## Conventions

- Angles in radians; `dir = (cos θ, sin θ)`. The camera plane is perpendicular to `dir`,
  scaled by `FOV`.
- World units are map cells; the player radius is ~0.18 cells.
- New gameplay = a new pure function in `src/` (test-first) + a few lines of wiring in
  `index.html`.
