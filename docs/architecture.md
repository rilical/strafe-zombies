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
- `barricades.js` — the boarded-window mechanic on top of `barriers.js`' board counts:
  `windowPoints` (inside/outside cell centres), `pickWindow` (which window a shambler attacks,
  preferring boarded ones), `tickBreak` (the per-plank tear clock), and `findRepairableWindow`
  (the nearest window the player can re-nail). `index.html` spawns zombies OUTSIDE in a
  `breaking` state, tears a plank per `TEAR_SECS` until the barricade is down, then promotes them
  to the flow-field chase; the player presses `F` at a window to repair a plank for points.
- `markers.js` — `buyableMarkers(level, world, player)` lists the buyables still worth showing
  on the radar (owned Perk-a-Colas and opened debris doors drop out); the minimap draws each.

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

### Juice — `shake.js`, `popups.js`, `particles.js`, `decals.js`, `sfx.js`
Presentation-only modules; each is pure and unit-tested, and `index.html` owns the canvas /
WebAudio side-effects:
- `shake.js` / `popups.js` / `particles.js` — screen-shake trauma, floating +N score popups,
  and blood/spark puffs.
- `decals.js` — persistent marks: `addDecal(list, decal, cap)` keeps a capped list,
  `tickDecals(list, dt)` ages them (a `fade` for finite `ttl`, culling the expired), and
  `projectWallDecal`/`projectFloorDecal(player, FOV, W, H, decal)` map a world point to screen
  space using the same camera transform as `sprites.js`. `index.html` drops a permanent bullet
  hole where a shot bites a wall and a 12s blood pool on a kill, then paints them depth-clipped
  against the wall buffer (between the wall cast and the actors).
- `sfx.js` — frozen `SFX` recipe table + `buildVoice(name, rng)` → a schedulable
  `{ dur, layers:[{ wave, freq:[[t,hz]], gain:[[t,level]] }] }` plan (with `adsr` envelope
  helper). `index.html` owns a lazily-created `AudioContext` and a `playSfx(name)` that turns
  each layer into an oscillator (or low-pass-filtered white noise) following the breakpoint
  curves, called at the shoot/reload/hit/headshot/kill/buy/deny/door/hurt/groan/roundstart/
  powerup/nuke seams — plus the Batch 6 voices: `snarl` (spawn), `death` (kill), an ambient
  `groan` on a wandering timer, and the three Perk-a-Cola jingles on a perk buy. No audio
  files — every voice is synthesised live.

### Procedural polish — `loadout.js`, `weapons.js`/`projectiles.js`, `viewmodels.js`, `zombieArt.js`, `props.js`, `walltex.js`, `perks.js`
The Batch 6 look-and-feel layer. Every module is pure, dependency-free, unit-tested, and asset-free
(procedural canvas + WebAudio only); `index.html` wires each at one seam:
- `loadout.js` — a two-slot weapon inventory: `createLoadout`, `equip(loadout, id) → { loadout,
  replaced }`, `swap`, `activeWeapon`. `player.loadout` replaces the old `player.weapon` string;
  `activeId()` reads the held gun, **Q / mouse-wheel** swap (cancelling any reload), and a buy/box
  routes its grant through `equip`. The HUD shows the active mag + the stowed gun.
- `weapons.js` + `projectiles.js` — the richer arsenal (Trench gun, BAR, and the box-only **Ray
  Gun**) plus bolt physics: `spawnBolt`/`stepBolt`/`boltHitsWall`/`splashTargets`. Firing the Ray
  Gun (`weapon.projectile`) launches a travelling bolt instead of a hitscan; `index.html` advances
  each bolt per frame and detonates it on a wall/at max range, applying `shooting.applyDamage` +
  `scoreForHit` to everything in the splash radius (no new rule in the glue).
- `viewmodels.js` — `viewmodel(weaponId, { recoil }) → { shapes, muzzle }`, a normalised
  first-person descriptor per gun. `drawWeapon` maps the shapes into a bottom-centre panel that
  leans toward the cursor and bobs; the Ray Gun's `glow` shapes get an emerald muzzle flash.
- `zombieArt.js` — `zombieSprite(seed)` (deterministic mulberry32 look: skin/shirt/pants + gore
  variants) and `zombieBands(sprite, phase) → { sway, bands }` (an animated shamble draw-list).
  `paintZombie` caches one sprite per zombie id and paints its bands depth-clipped; the glowing
  eyes and white hit-flash are kept.
- `props.js` — `worldProps(level, world)` lists the buyable machines (perk colas, Mystery Box, wall
  mounts) as in-world billboards and `propSprite(kind, palette)` draws each. This fixes the
  previously invisible machines: they now render as labelled, glowing props depth-sorted in with
  the actors.
- `walltex.js` — `themeForCell(cx, cy)` picks a per-room theme (brick / concrete / planks / blood)
  and `wallShade(theme, side, u, v) → [r,g,b]` shades each wall texel. The raycaster samples it
  top→bottom down every wall column (E/W faces auto-darkened), then layers torch flicker + fog.
- `perks.js` (extended) — `perkBadges(player)` returns the owned perks as `{ id, color, badge,
  label }` in canonical order; the HUD renders a coloured badge row from it.

All world billboards (props + corpses + power-up drops + zombies + Ray-Gun bolts) now share one
depth-sorted `drawSprites()` pass so a nearer sprite correctly occludes a farther one.


- Owns player state, the input map, the rAF loop, and all drawing.
- Calls only pure functions from `src/`; holds no game *rules* itself beyond wiring.

## Conventions

- Angles in radians; `dir = (cos θ, sin θ)`. The camera plane is perpendicular to `dir`,
  scaled by `FOV`.
- World units are map cells; the player radius is ~0.18 cells.
- New gameplay = a new pure function in `src/` (test-first) + a few lines of wiring in
  `index.html`.
