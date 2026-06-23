# Zombies build swarm — roster, contracts & protocol

Parallel construction of the Nacht-der-Untoten v1 (design:
[`docs/plans/0002-zombies-survival.md`](../plans/0002-zombies-survival.md)). Each pure
`src/` module is built by one **independent agent on its own branch**. This thread is the
**integration agent**: it owns `index.html`, all wiring, and every merge.

## How this works

- **One agent ⇄ one module ⇄ one branch (`feat/<module>`) ⇄ one PR.**
- Agents communicate **only through the frozen data contracts below** — never by importing
  each other. If you need another module's data in a test, build a tiny local fixture.
- The integration agent merges green, reviewed branches in build-sequence order and wires
  them into `index.html`. No module agent ever edits `index.html`.

## Roster (all 15 can run in parallel)

| Agent | Branch | Owns | Consumed by |
|---|---|---|---|
| [economy](economy.md) | `feat/economy` | `src/economy.js` | shooting, weapons, powerups, HUD |
| [rounds](rounds.md) | `feat/rounds` | `src/rounds.js` | spawner / integration |
| [survival](survival.md) | `feat/survival` | `src/survival.js` | integration |
| [perks](perks.md) | `feat/perks` | `src/perks.js` | survival, weapons, integration |
| [weapons](weapons.md) | `feat/weapons` | `src/weapons.js` | shooting, powerups, integration |
| [shake](shake.md) | `feat/shake` | `src/shake.js` | integration |
| [popups](popups.md) | `feat/popups` | `src/popups.js` | integration |
| [particles](particles.md) | `feat/particles` | `src/particles.js` | integration, decals (ref) |
| [sprites](sprites.md) | `feat/sprites` | `src/sprites.js` | integration, decals (ref) |
| [level](level.md) | `feat/level` | `src/level.js` | barriers, pathfind, integration |
| [shooting](shooting.md) | `feat/shooting` | `src/shooting.js` | integration |
| [barriers](barriers.md) | `feat/barriers` | `src/barriers.js` | pathfind, integration |
| [pathfind](pathfind.md) | `feat/pathfind` | `src/pathfind.js` | integration (retires `game.js`) |
| [powerups](powerups.md) | `feat/powerups` | `src/powerups.js` | integration |
| [decals](decals.md) | `feat/decals` | `src/decals.js` | integration |

## Universal workflow — every agent follows this

1. **Read first:** `AGENTS.md`, `docs/working-agreement.md`,
   `docs/plans/0002-zombies-survival.md`, this file, and your brief `docs/agents/<you>.md`.
2. **Don't reinvent the wheel.** Reuse `src/engine.js` helpers; copy the style of
   `test/engine.test.js` / `test/game.test.js`; adapt the canonical algorithm named in your
   brief's *Research* line instead of inventing one. **No new runtime dependencies.**
3. **TDD** (skill `test-driven-development`): write a failing `vitest` test in
   `test/<module>.test.js` **first**, then the minimal `src/<module>.js` to pass it, then
   refactor. No logic ships without a test.
4. **Stay in your lane.** Edit **only your two files**. Never touch `index.html`,
   `package.json`, or another agent's file. (Exception: `pathfind` *adds* `pathfind.js` but
   does **not** delete `game.js` — the integration agent retires it.)
5. **Constant PRs (our one design rule).** Commit small and often — `test → code → refactor`
   as separate commits — and keep your PR on `feat/<module>` continuously updated. Work the
   branch until your **whole** task is done, not a partial slice.
6. **Ship + review loop, per branch, as a pattern:**
   `test-driven-development` → `verification-before-completion` (run `npm test`, confirm
   green, and that you didn't break `engine`/`game` tests) → `requesting-code-review` →
   `receiving-code-review` (address feedback with rigor) → `finishing-a-development-branch`.
7. **Done =** contract fully implemented · `test/<module>.test.js` thorough and green ·
   `npm test` green · code commented for a reader · self-contained PR (what/why, links your
   brief) · then **report back to the integration agent**.

## Contracts — FROZEN. Do not change unilaterally.

All world units are **map cells**; entity positions are floats; a cell `(cx,cy)` has centre
`(cx+0.5, cy+0.5)`. Angles are **radians**; `dir = (cos θ, sin θ)`. Match `src/engine.js`.

### Shared GameState shapes

```js
player = { x, y, angle, hp, maxHp, points, weapon, ammo:{ [id]:{ mag, reserve } },
           shootCooldown, reloadTimer, lastDamageMs, perks /* Set<string> */ }
zombie = { id, x, y, angle, hp, speed, state, hitCooldown, spawnWindow }
round  = { round, phase /* 'intermission'|'spawning'|'waiting' */,
           zombiesToSpawn, aliveCount, spawnTimer, roundTimer }
world  = { doors:{ [id]:boolean }, windows:{ [id]:boards /* int */ } }
powerUps = [ { id, type, x, y, ttl } ]
activePowerUps = { instaKill /* sec */, doublePoints /* sec */ }
```

`player.maxHp` is authoritative for `survival`; `perks.effectiveMaxHp` derives it and the
integration agent keeps `player.maxHp` in sync when a perk is bought. Pure functions are
**immutable** — return new objects/arrays, never mutate inputs.

### Level data shape (`level.js` must conform; `barriers`/`pathfind` code against it)

```js
LEVEL = {
  grid,            // number[][] row-major: 0 empty, 1/2/3 wall types; border solid
  W, H,            // grid size in cells
  spawn: { x, y, angle },
  rooms:  [ { id, name } ],
  windows:[ { id, cx, cy, room, faceX, faceY } ],          // boarded windows, face = inward
  mounts: [ { id, weaponId, cost, cx, cy, faceX, faceY } ],// wall-gun buy spots
  box:    { cx, cy },                                       // Mystery Box
  perkMachines:[ { id, perkId, cost, cx, cy } ],           // 3 Perk-a-Cola machines
  debris: [ { id, cost, cells:[[x,y],...], opensRoom } ]    // buyable doors → cells passable
}
```

### Changing a contract

If your work proves a contract wrong or insufficient, **do not edit it silently**. Note it
on your PR and message the integration agent; the integration agent updates this file and
notifies every dependent agent listed in the roster.

## Integration order (the integration agent's job)

Module branches merge as they go green; these are wired in the build-sequence order from the
plan: sprites → loop/mouse-look → pathfind → shooting+juice (shake/popups/particles) →
survival → rounds → economy → level+barriers → debris doors → weapons+box → powerups →
perks → textured renderer → decals → polish. The fixed-timestep loop, mouse-look, the
textured-rendering pipeline (PR 13), HUD, and retiring `game.js` all live in `index.html`
and belong to the integration agent — not to any module agent.
