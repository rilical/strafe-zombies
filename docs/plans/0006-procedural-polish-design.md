# 0006 — Procedural Polish: weapons, ray gun, decal zombies, props, voices, map

**Status:** design (frozen contracts for parallel build)
**Base:** `main` (PR #14 merged — the full Nacht loop is shipped)
**Goal:** a big *look-and-feel + arsenal* pass that keeps the project's hard conventions —
**fully procedural, zero asset files, zero runtime deps, ES modules**. Every new rule or art
*generator* is a **pure, unit-tested `src/` module**; `index.html` only paints/plays what those
modules emit (the `sfx.js` / `decals.js` pattern). TDD per module, one small PR each.

## Why

The world looks empty and the arsenal is thin: the Juggernog/Speed/Double-Tap machines and the
Mystery Box are **invisible in 3D** (they only show on the minimap), there is only one weapon
slot, the zombies are crude column figures, the walls are flat-shaded, and the perks have no
jingle and no HUD presence. This pass fixes all of that procedurally.

## Constraints (apply to every module)

- Pure ES module, no new deps, no asset files. Logic/generators in `src/*.js`, exported + unit
  tested with `vitest`. `index.html` stays presentation-only (no game rules).
- Seam edits, not rewrites. One concern per PR. `npm test` green before any PR.
- Angles in radians; `dir = (cos θ, sin θ)`; world units are map cells (match `src/engine.js`).
- Art modules return **structured descriptors** (draw-lists / synth recipes), never touch the
  DOM/canvas/WebAudio — so they are testable in node with no browser.

---

## Frozen cross-cutting contracts

These values are frozen so all eight modules build in parallel without colliding.

### Weapon roster (`src/weapons.js`)

Existing entries stay byte-for-byte: `m1911`, `kar98k`, `carbine`, `thompson`.

New entries:

| id | name | damage | rpm | mag | reserve | reloadMs | auto | price | notes |
|----|------|--------|-----|-----|---------|----------|------|-------|-------|
| `trench` | Trench Gun | 220 | 75 | 6 | 48 | 2600 | false | 1500 | shotgun — high close damage (single hitscan, no shooting.js rewrite) |
| `bar` | B.A.R. | 75 | 500 | 20 | 200 | 3000 | true | 1800 | auto rifle |
| `raygun` | Ray Gun | 1000 | 120 | 20 | 160 | 2500 | false | 0 | **wonder weapon**: `boxOnly:true`, `projectile:true`, `splash:2.0`, `boltSpeed:12` (cells/s), `boltRange:18` |

- `raygun` carries extra fields `{ boxOnly:true, projectile:true, splash:2.0, boltSpeed:12, boltRange:18 }`.
- The Mystery Box pool (`rollMysteryBox`) becomes `[kar98k, carbine, thompson, trench, bar, raygun]`
  with `raygun` **rare** (weight ~1 vs ~4 each for the rest). Wall-buys never grant `raygun`
  (`boxOnly`).
- Seven weapon ids total: `m1911 kar98k carbine thompson trench bar raygun`.

### Perk display metadata (`src/perks.js` extension + `src/props.js`)

Frozen per-perk display fields (both the HUD and the in-world machines use these):

| perk id | color | badge | label |
|---------|-------|-------|-------|
| `jugg` | `#c0392b` | `JUG` | Juggernog |
| `speedCola` | `#2ecc71` | `SPD` | Speed Cola |
| `doubleTap` | `#e1b12c` | `2X` | Double Tap |

### Animation / descriptor conventions

- Sprite descriptors use normalized space: `u ∈ [0,1]` left→right, `v ∈ [0,1]` top→bottom.
  `index.html` scales to the billboard/viewmodel rect and applies fog/flash itself.
- Colors in descriptors are `[r,g,b]` 0–255 **or** hex strings (state which per module); no alpha
  baked in unless noted.

---

## Modules (one subagent + TDD each)

### 1. `src/loadout.js` — two-slot weapon inventory
Pure inventory state; ammo stays in `player.ammo[id]` (unchanged).
- `createLoadout(startId)` → `{ slots:[startId, null], active:0 }`.
- `equip(loadout, id)` → `{ loadout, replaced }`. If `id` already in a slot: make that slot
  active, `replaced=null`. Else if a slot is empty: fill it, make it active, `replaced=null`.
  Else: overwrite the **active** slot, `replaced = old active id`.
- `swap(loadout)` → active toggles to the other slot **iff** that slot is non-null, else
  unchanged.
- `activeWeapon(loadout)` → `slots[active]` (may be null only before any gun).
Tests: fill empty slot, replace active when full, no-dup when re-equipping held gun, swap toggles
/ no-ops on empty, ammo untouched.

### 2. `src/weapons.js` (extend) + `src/projectiles.js` (new) — arsenal + ray-gun bolt
- weapons.js: add the three entries above; extend `rollMysteryBox` pool + weighting; keep all
  existing exports and tests green. Add tests for the new stats, box pool membership, `boxOnly`
  exclusion from wall-buys (if `buyWallWeapon` guards it).
- projectiles.js (generic, ray-gun is the first user):
  - `spawnBolt(x, y, angle, weapon)` → `{ x, y, vx, vy, damage, splash, range, traveled:0, dead:false }`
    (`vx=cosθ*boltSpeed`, `vy=sinθ*boltSpeed`).
  - `stepBolt(bolt, dt)` → moved bolt (pure clone), `traveled += speed*dt`; sets `dead` when
    `traveled >= range`.
  - `boltHitsWall(bolt, isBlocked)` → boolean (`isBlocked(floor(x),floor(y))`).
  - `splashTargets(x, y, radius, zombies)` → `[{ id, dist, damage }]` for zombies within `radius`,
    damage scaled `bolt.damage * (1 - dist/radius)` clamped ≥ 0 (center = full).
Tests: bolt travels along angle, dies at range, wall stop, splash selects only in-radius with
falloff, empty list when none.

### 3. `src/viewmodels.js` — first-person weapon viewmodels
- `viewmodel(weaponId, frame = {})` → `{ shapes:[{type:'rect'|'poly', x,y,w,h|points, color, glow?}], muzzle:{x,y} }`
  in normalized viewmodel space (bottom-center anchored). `frame` may carry `{ recoil:0..1, bob:{x,y} }`
  to offset the model. A **distinct silhouette per id**: pistol (small), kar98k (long bolt rifle),
  carbine (mid), thompson (drum SMG), trench (double-barrel), bar (big LMG + bipod), raygun
  (bulbous green body, fins, `glow:true` emerald). Throw `RangeError` on unknown id.
Tests: every roster id returns ≥1 shape + a muzzle anchor; coords within [0,1]; raygun shapes
flagged `glow`; recoil frame offsets shapes vs neutral.

### 4. `src/props.js` — in-world buyable billboards (fixes invisible machines)
- `worldProps(level, world)` → array of `{ kind, id, x, y, palette, label, glow }` (x,y = cell
  center +0.5), **static** (always present — a machine stays physically there):
  - perk machines from `level.perks`: `kind:'perk'`, `palette`/`label` from the frozen perk
    metadata, `glow:true`.
  - Mystery Box from `level.box`: `kind:'box'`, wooden palette, `label:'?'`, `glow:true`.
  - wall mounts from `level.mounts`: `kind:'mount'`, gunmetal palette, `label` = weapon name.
- `propSprite(kind, palette, frame)` → optional helper returning normalized draw-bands for the
  billboard (machine body + glow panel + label plate), same descriptor convention as zombieArt.
Tests: one prop per perk/mount + the box, positions match level cell centers +0.5, palette/label
mapping per perk, stable order.

### 5. `src/zombieArt.js` — procedural "decal" zombie sprite
- `zombieSprite(seed)` → deterministic look `{ skin:[r,g,b], shirt:[r,g,b], pants:[r,g,b],
  variant:{ missingArm:bool, exposedRibs:bool, bloody:bool } }` from `seed`.
- `zombieBands(sprite, phase)` → `{ sway, bands:[{ layer, uMin,uMax, vMin,vMax, color:[r,g,b] }] }`
  describing the figure in normalized sprite space: legs, pants, torso/shirt, arms (one hidden if
  `missingArm`), head, plus gore overlays (`exposedRibs`/`bloody`). `phase` drives shamble: limb
  swing + head bob baked into band positions and `sway`.
Tests: deterministic per seed; distinct variants across seeds; bands within [0,1]; phase shifts
limb bands; missingArm drops an arm band.

### 6. `src/sfx.js` (extend) — richer zombie voices + perk jingles
Keep all 13 existing presets + their test green. Add (same recipe-table + `buildVoice` format):
- `snarl` (spawn — sharp rasp), richer `groan` (idle ambient), `death` (wet falling gurgle).
- perk jingles `jingleJugg`, `jingleSpeed`, `jingleDoubleTap` — short distinct musical stingers
  (a few scheduled tones each).
Tests: each new preset exists and `buildVoice` returns a well-formed plan; deterministic given a
seeded rng; existing presets unchanged.

### 7. `src/walltex.js` — procedural wall texture sampler (nicer map)
- `wallShade(theme, side, u, v)` → `[r,g,b]` for a wall point. `theme ∈ {'brick','concrete','planks','blood'}`,
  `side` (0 = N/S, 1 = E/W) keeps the existing directional darkening, `u,v ∈ [0,1]`. Procedural
  brick courses / plank seams / concrete mottling via mod math + a small deterministic hash.
- `themeForCell(cx, cy)` → one of the four themes (quadrant split of the 16×16 map) so the four
  rooms read differently. (Pure; `index.html` calls it per wall hit.)
Tests: deterministic; rgb in [0,255]; themes visibly differ; brick theme shows mortar lines
(periodic shade dips); side shading darkens E/W.

### 8. `src/perks.js` (extend) — display metadata + HUD selector
- Add the frozen `color`/`badge`/`label` fields to each `PERKS` entry (keep `id`,`name`,`cost`).
- `perkBadges(player)` → ordered `[{ id, color, badge, label }]` for owned perks (reads the
  `player.perks` Set; tolerate Array/undefined). Order = `jugg, speedCola, doubleTap`.
Tests: badges reflect ownership, stable order, handles Set/Array/undefined, metadata values match
the frozen table.

---

## Integration (`index.html` — me, presentation only, not unit-tested)

Wired after each module merges, verified with the proven headless harness:
1. **Loadout/swap:** replace the single `player.weapon` flow with a `loadout`; **Q** and
   **mouse-wheel** call `swap`; wall-buy/box route through `equip` into the active slot; the
   ammo HUD shows **both slots** (active highlighted).
2. **Viewmodels:** `drawWeapon()` paints `viewmodel(activeId, {recoil,bob})`; ray gun glows.
3. **Ray gun bolts:** on fire, `spawnBolt`; each frame `stepBolt` + `boltHitsWall`; on death/wall
   apply `splashTargets` damage; render bolts as glowing green billboards (depth-clipped).
4. **Decal zombies:** `drawZombies()` paints `zombieBands(sprite, phase)`; per-zombie `seed` from
   id; hit-flash overrides palette.
5. **Voices:** play `snarl` on spawn, ambient `groan` on a timer, `death` on kill; play the
   matching perk **jingle** on purchase.
6. **Props:** depth-sort `worldProps(level, world)` in with zombies/corpses/powerups and paint
   each billboard — the machines/box/mounts are finally visible in 3D.
7. **Perk HUD:** render `perkBadges(player)` as a row of colored perk icons.
8. **Map polish:** wall caster samples `wallShade(themeForCell(cx,cy), side, u, v)`; floor/ceiling
   gradient + ambient tint per zone.

## Process

Same as batches 2–5: freeze contracts (this doc) → spawn the eight builders in parallel
(autopilot, TDD, one PR each, base = the batch trunk branch) → I review + squash-merge each →
wire into `index.html` → headless-harness verify → docs in the same flow. Land it all on a batch
trunk branch, then one milestone PR → `main`.

## Out of scope / deferred

- Real PNG/audio asset files (rejected — breaks the procedural/no-deps convention).
- The textured-framebuffer engine rewrite (separate, high-risk; `walltex` gives the look without it).
- Shotgun pellet-spread mechanics (modeled as high-damage hitscan to avoid rewriting `shooting.js`).
