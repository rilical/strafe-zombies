# 0002 — Zombies survival (Nacht-der-Untoten mode)

**Status:** planned

This is an **epic plan**: it defines the whole v1 of the zombies game and the ordered
sequence of small, single-purpose PRs that build it. Each numbered step below lands as its
own test-first PR (some may grow their own `docs/plans/000N-*.md` when they need it). The
plan is the record of *intent*; if an approach changes mid-flight we note it at the bottom
rather than rewriting history.

---

## Goal

Turn the STRAFE raycaster baseplate into a faithful-but-simple **Call of Duty "Nacht der
Untoten"** survival game: you spawn in a sealed building, **buy wall guns and open debris
doors with points**, **run laps to train the horde**, and **shoot escalating rounds of
zombies** until you go down. Authentic round math, a Mystery Box, the classic power-up
drops, and three stat Perk-a-Colas are in; the build stays vanilla ES modules, zero runtime deps, test-first.

## Success criteria

- Loads instantly, no build step; the full game runs without a refresh.
- Recognisably *Nacht der Untoten* within ~30 seconds: windows, wall-buys, the round howl,
  the points loop.
- Every gameplay rule lands as a small, `vitest`-backed, documented PR; `index.html` stays
  thin and untested. `npm test` green on every commit.

---

## Locked design decisions

These were settled during brainstorming and are the contract for the build:

| Area | Decision |
|---|---|
| **Scope (v1)** | Faithful floor + wall guns + debris doors + boarded windows + rounds + points + health/game-over + **Mystery Box** + **power-ups** (Nuke / Max Ammo / Insta-Kill / Double Points) + **3 stat perks** (Juggernog / Speed Cola / Double Tap). |
| **Controls** | **Pointer-lock mouse-look** to aim, **hold-mouse to fire**, **WASD** move (A/D strafe, W/S forward-back), **R** reload, **F** buy when prompted, **1–3 / wheel** swap weapons. |
| **Map** | **Faithful loop**: 4 connected rooms around a solid central core; buyable debris (1000) opens the building into a runnable lap; 6 boarded windows; 3 wall-gun mounts; 1 Box; 3 Perk-a-Cola machines. |
| **Difficulty** | **Faithful CoD math** (authentic counts/HP/speed/cadence). The survival model's ~5s regen keeps it fair. A difficulty toggle can come later. |
| **Architecture** | **Per-system pure modules** in `src/`, orchestrated by a thin `index.html`. New system = new file + ~one wiring line. No mega-reducer (trivial to add later if wanted). |
| **HUD** | **Classic Nacht**: points top-left, glowing round counter bottom-right, ammo above it, **no health bar** — damage shows as the red screen-edge vignette. |
| **Decals** | **Full**: persistent **wall bullet holes + floor blood pools**, which requires a **textured rendering pipeline** (framebuffer + textured walls + floor casting). Transient blood puffs/screen-splatter ship earlier. |
| **Audio** | **Fully procedural** WebAudio (zero asset files): per-weapon shots, spatialised zombie groans, impacts, reload, round howl, purchase, power-up stings. |
| **Perks** | **Three stat Perk-a-Colas** as buyable machines: **Juggernog** (max HP 100→250), **Speed Cola** (½ reload), **Double Tap** (~1.33× fire rate). Deliberately *series*-faithful, not Nacht-canonical (perks debuted on Verrückt). **Quick Revive / downed state is out** — going down stays instant game-over. |

---

## Architecture

### Module map (`src/` — pure, dependency-free, unit-tested)

| Module | Responsibility (key exports) |
|---|---|
| `engine.js` *(exists)* | Raycaster core. `castRay`, `moveWithCollision`, `isWalkable`, `wallAt`. Conventions unchanged: radians, `dir=(cos θ,sin θ)`, world units = cells. |
| `level.js` *(new, data)* | The faithful-loop level: walls-only grid, window cells, wall-gun mounts, Box cell, debris definitions `{ id, cost, cells }`. Spawn/buy *positions* live here, not logic. |
| `barriers.js` *(new)* | Door/window overlay logic. `createWorld(level)`, `openDoor(world,id)`, `repairBoard(world,winId)`, `tearBoard(world,winId)`, `isBlocked(level,world,cx,cy)`. |
| `economy.js` *(new)* | `earn(state,n)`, `spend(state,cost)→{ok,state}`, `pointsForHit()`, `pointsForKill({melee})`. Pure, immutable, never negative. |
| `rounds.js` *(new)* | Round math + spawner state machine. `zombiesForRound`, `zombieHealthForRound`, `zombieSpeedForRound`, `spawnDelayForRound`, `maxAliveForRound`, `createSpawnState`, `tickSpawner(state,dt)→{state,shouldSpawn}`, `advanceRound`. |
| `pathfind.js` *(new)* | Flow-field navigation (many zombies → one player). `buildFlowField(level,world,col,row)→Int8Array`, `flowDir(field,W,col,row)→{dx,dy}`, `stepZombieAlong(level,world,zombie,field,dt,speed)`. **Supersedes** `game.js` `stepZombie`. |
| `weapons.js` *(new)* | `WEAPONS` data + ammo/reload state. `fire(weaponState,nowMs)`, `startReload`, `tickReload`, `refillAmmo`, `buyWallWeapon(player,id)`, `rollMysteryBox(player,rng)`. |
| `shooting.js` *(new)* | Hitscan hit detection. `shootRay(map,px,py,dx,dy,zombies,opts)→{zombie,t}\|null`, `fireWeapon`, `resolveShot(map,player,zombies,weapon)→{zombies,scoreDelta}`, `applyDamage`, `scoreForHit`. |
| `survival.js` *(new)* | `applyContactDamage(player,dmg,nowMs)`, `regen(player,nowMs)`, `isGameOver(player)`. HP 100; per-zombie attack cooldown; ~5s regen-to-full. |
| `perks.js` *(new)* | Perk-a-Cola data + effects. `PERKS` `{id,cost}`, `grantPerk(player,id)`, `hasPerk(player,id)`, and pure multipliers `effectiveMaxHp(player)`, `effectiveReloadMs(player,base)`, `effectiveRpm(player,base)`. Owns the perk IDs; `survival`/`weapons` consume effective values. |
| `powerups.js` *(new)* | `maybeDrop(zombie,rng)→drop\|null`, `tickPowerUps(state,dt)`, effect helpers: Nuke (kill-all + points), Max Ammo, Insta-Kill timer, Double-Points timer. |
| `sprites.js` *(new)* | Billboard projection. Extends 0001's `projectSprite` to `projectSprites(player,FOV,W,H,sprites)→sorted[]` (back-to-front, per-column depth-clipped). |
| `particles.js` *(new)* | Transient effects. `spawnBloodPuff(list,x,y)`, `spawnSpark`, `tickParticles(list,dt)`. |
| `decals.js` *(new)* | Persistent, **capped/pooled** decals. `addDecal(list,decal)`, `tickDecals`, `projectFloorDecal` / `projectWallDecal` (world→screen math; pixel drawing stays in `index.html`). |
| `shake.js` *(new)* | `tickShake(trauma,dt,decay)`, `shakeOffset(trauma,maxPx)` (trauma² screen shake). |
| `popups.js` *(new)* | `spawnPopup(list,x,y,value)`, `tickPopups(list,dt)` (floating points text). |

`game.js`'s `stepZombie` stays until `pathfind.js` replaces its use, then is removed with its
test updated (seam edit, not a dangling export).

### Top-level GameState (plain data; owned by `index.html`)

```
player:   { x, y, angle, hp, maxHp, points, weapon, ammo:{ [id]:{mag,reserve} },
            shootCooldown, reloadTimer, lastDamageMs, perks:Set<id> }
zombies:  [ { id, x, y, angle, hp, speed, state, hitCooldown, spawnWindow } ]
round:    { round, phase:'intermission'|'spawning'|'waiting',
            zombiesToSpawn, aliveCount, spawnTimer, roundTimer }
world:    { doors:{ [id]:open }, windows:{ [id]:boards } }   // overlay; static data in level.js
powerUps: [ { id, type, x, y, ttl } ]    activePowerUps:{ instaKill, doublePoints }
```

Render-only state lives in `index.html`, never in the pure modules: muzzle-flash timer,
damage-vignette timer, shake trauma, popup list, particle list, decal list, the framebuffer.

### The loop (`index.html`, untested glue)

Replace the variable-dt loop with a **fixed-timestep accumulator** for determinism (matching
what the pure modules are tested against):

```js
const FIXED_DT = 1 / 60;
let acc = 0;
function loop(now) {
  acc += Math.min((now - last) / 1000, 0.25); last = now;
  while (acc >= FIXED_DT) { stepAll(FIXED_DT); acc -= FIXED_DT; }
  render();
  requestAnimationFrame(loop);
}
```

`stepAll(dt)` orchestrates the pure systems in order each tick: read input → move player
(`moveWithCollision`) → rebuild flow field *iff* the player changed cell → step zombies →
`tickSpawner` (+ spawn at a reachable window if `aliveCount < maxAlive`) → contact damage →
regen → `tickPowerUps` → weapon cooldown/reload → decay popups/particles/shake.

---

## Faithful constants (single source of truth)

```
Rounds      count(r)      = 2r + 4
            hp(r)         = floor(100r + 50)            for r ≤ 9
                          = floor(950 · 1.1^(r-9))      for r ≥ 10
            speed(r)      = 0.5 (r1-2) → 0.75 (r3-5) → 1.0 (r6-9) → 1.2 (r10+)
            spawnDelay(r) = max(0.67, 2.5 · 0.9^(r-1))  seconds
            maxAlive(r)   = min(24, r + 5)
            intermission  = 10 s
Economy     start 500 · hit +10 · kill +60 · knife +130 · repair board +10
            debris 1000 · Kar98k 200 · Carbine 600 · Thompson 1200 · Box 950
            ammo refill = ½ wall price
Survival    hp 100 · zombie hit 50 (2 hits to down)
            regen: 2s quiet delay after last hit, then refill to maxHp over 3s (full ~5s after last hit)
Weapons     data-driven WEAPONS table { damage, rpm, magSize, reserve, reloadMs, auto }
            M1911   dmg 40,  rpm 350, mag 8,  reserve 80,  reload 1500, auto false (start)
            Kar98k  dmg 100, rpm 90,  mag 5,  reserve 50,  reload 2200, auto false (200)
            Carbine dmg 50,  rpm 360, mag 15, reserve 120, reload 1800, auto false (600)
            Thompson dmg 35, rpm 700, mag 30, reserve 240, reload 2400, auto true  (1200)
            range 20 (rifles longer) · headshots deferred → kills are flat +60
Perks       Juggernog 2500 → maxHp 100→250 · Speed Cola 3000 → reloadMs ×0.5
            Double Tap 2000 → rpm ×1.33 (faster fire) · effects are pure multipliers
Power-ups   drop chance ~3% on kill · drop ttl ~15s · Insta-Kill 30s · Double Points 30s
            Nuke = kill all alive + 400 pts
Juice       screen shake 0.25 trauma/shot, maxPx 4–6 (canvas-space)
```

---

## Build sequence (ordered PRs)

Gameplay first on the simple flat renderer; the heavy textured-rendering work is the
capstone so we never gold-plate the renderer before the game is fun. Each PR is test-first
where it touches `src/`.

1. **Sprite rendering** — `sprites.js` (`projectSprite`, then `projectSprites`) + per-column
   depth buffer in `index.html`. Fulfils plan 0001; draws one depth-correct billboard.
   *Test:* projection, occlusion vs `perpWallDist`, scale-by-distance, behind-camera.
2. **Fixed-timestep loop + mouse-look + WASD** — `index.html` only. Pointer-lock yaw,
   A/D strafe, hold-to-fire plumbing (no shooting yet). *(No `src/` change.)*
3. **Zombie nav (flow field)** — `pathfind.js`; one zombie spawns and chases via the field,
   drawn as a sprite; retire `stepZombie` usage. *Test:* field points downhill to player,
   `stepZombieAlong` slides on walls, recompute-on-cell-change.
4. **Shooting + first juice** — `weapons.js` (pistol) + `shooting.js` + `shake.js` +
   `popups.js` + `particles.js` (transient blood/screen-splatter) + gunshot SFX + muzzle
   flash + hit marker. Click kills the zombie. *Test:* nearest hit, wall occlusion, immutable
   `applyDamage`, `scoreForHit`, shake/popup reducers.
5. **Health & game-over** — `survival.js`; contact damage, red vignette, down → game-over
   overlay → restart. *Test:* two-hit down, per-zombie cooldown, regen delay, `isGameOver`.
6. **Round system** — `rounds.js` spawner state machine; multi-zombie rounds, intermission,
   round counter HUD, round howl SFX. *Test:* all the round formulas + `tickSpawner`/
   `advanceRound` phase transitions.
7. **Points economy** — `economy.js`; earn on hit/kill, points HUD (top-left), denial buzz.
   *Test:* `earn`/`spend` immutability + non-negative, `pointsForHit/Kill`.
8. **The map + windows** — `level.js` faithful-loop grid + `barriers.js` windows; zombies
   spawn at windows and tear boards before entering. *Test:* `isBlocked`, board tear/repair,
   spawn only at reachable windows.
9. **Buyable debris doors** — `barriers.openDoor` via `economy.spend`; opening a door
   activates its room's windows and extends the lap. *Test:* door gates movement until bought.
10. **Wall guns + Mystery Box** — `weapons.buyWallWeapon`, `rollMysteryBox`, ammo refill,
    reload; wall-buy prompts + purchase "cha-ching". *Test:* buy/own/refill/box-roll logic.
11. **Power-ups** — `powerups.js` Nuke / Max Ammo / Insta-Kill / Double Points; drops,
    proximity pickup, timers, stings. *Test:* `maybeDrop`, effect helpers, `tickPowerUps`.
12. **Perks (Perk-a-Cola)** — `perks.js`: Juggernog / Speed Cola / Double Tap as buyable
    machines via `economy.spend`; `survival` reads `effectiveMaxHp`, `weapons` read
    `effectiveReloadMs` / `effectiveRpm`; perk jingle + bottle-buy SFX. *Test:* `grantPerk`
    immutability, `hasPerk`, each effective-stat multiplier, can't-rebuy / insufficient-points.
13. **Textured rendering pipeline** — `index.html`: `Uint32Array` framebuffer (ImageData),
    textured walls, floor casting. The perf upgrade the research anticipated. *(Projection
    math that needs testing lives in `sprites.js`/`decals.js`.)*
14. **Persistent decals** — `decals.js` wall bullet holes + floor blood pools, capped/pooled.
    *Test:* world→screen projection, eviction/cap, depth-clip vs walls.
15. **Polish** — remaining spatialised SFX (groans, impacts), low-HP heartbeat pulse,
    blood-puff tuning, optional adaptive ambient drone.

---

## Test-first discipline

One `test/<module>.test.js` per `src/` module, written before the code (per `AGENTS.md`),
mirroring the existing `engine.test.js` / `game.test.js` style (`describe`/`it`, exact
`toBeCloseTo` on geometry, explicit immutability assertions). `index.html` is the only place
rendering/input/audio live and is **not** unit-tested — so it must contain no game *rules*.

## Definition of done (per PR)

`npm test` green · diff small and single-purpose · `index.html` wiring added only if
player-visible · `docs/*` updated in the same PR (this plan's status, `architecture.md`
where the data flow changes) · code commented for a reader · self-contained PR description
with its Plan + what/why.

## Non-goals / deferred (kills scope creep)

- **Headshots** — needs vertical aim/pitch (none yet); kills are flat +60. Revisit with pitch.
- **Quick Revive & the downed state** — the three *stat* perks (Juggernog / Speed Cola /
  Double Tap) are **in** v1; Quick Revive is **not**, because solo Quick Revive needs a
  down-and-self-revive state. Going down stays instant game-over. (`player.perks` is a `Set`;
  `perks.js` owns the IDs and exposes pure multipliers — `survival`/`weapons` consume the
  effective values, never perk IDs.)
- **Pack-a-Punch, shotgun pellets/penetration, damage falloff, random spread** — later tiers.
- **No asset files** — every texture/sprite/sound is generated procedurally in code.
- **No networking/multiplayer, no mobile/touch, no bundler/framework, no second level.**

## PRD changes (same PR as this plan)

Update `docs/prd.md` so the roadmap matches this pivot: core mechanic becomes *survive
escalating rounds by circle-strafing, buying, and shooting*; controls note mouse-look + WASD;
the feature list points here; non-goals updated (procedural audio is now **in**, flow-field
nav is now **in**, procedural textures/floor-casting now **in** — all still asset-free; A*,
WAD/BSP, networking, mobile, bundler, multi-level stay **out**). The three stat perks are now
**in** (Quick Revive / downed state stays out).
