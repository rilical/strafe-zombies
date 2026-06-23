# Agent: powerups — drops, timers & effects

**Branch:** `feat/powerups` · **Owns:** `src/powerups.js` + `test/powerups.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The classic floor drops: a kill sometimes drops a glowing power-up; picking it up fires Nuke,
Max Ammo, Insta-Kill, or Double Points. Pure drop/timer/effect logic.

## Contract — you MUST export (exact)
```js
maybeDrop(zombie, rng = Math.random) -> drop | null
   // ~3% chance; drop = { id, type, x, y, ttl:15 }, type ∈ {nuke,maxAmmo,instaKill,doublePoints}
tickPowerUps(state, dt) -> state'        // decay drop ttls (cull expired) + active timers → 0
applyNuke(zombies) -> { zombies, points:400 }       // clears all alive, awards points
applyMaxAmmo(player) -> player'                       // refill every owned weapon
activate(active, type, secs = 30) -> active'         // set instaKill/doublePoints timer
```
Insta-Kill and Double Points are 30s timers held in `activePowerUps`. All immutable.

## Consumes
`player` / `zombie` shapes; Max Ammo mirrors `weapons.refillAmmo`'s effect (by data — use a
fixture in tests, don't hard-import). Double Points multiplies `economy` payouts at the call
site (integration), not here.

## Consumed by
The integration loop (roll on kill, render/pick up drops, run timers, apply effects).

## Research
The classic CoD power-up set and durations (Nuke kills all + flat points, Insta-Kill 30s,
Double Points 30s, Max Ammo refills reserves). Confirm and match.

## Test plan (write failing first)
- `maybeDrop` is deterministic with a seeded `rng`; drop carries position + 15s ttl.
- `tickPowerUps` culls expired drops and counts active timers down to 0.
- `applyNuke` empties alive zombies and returns 400 points.
- `applyMaxAmmo` tops up owned weapons; `activate` sets a 30s timer. Immutability throughout.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
