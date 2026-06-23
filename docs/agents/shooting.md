# Agent: shooting — hitscan target selection & damage

**Branch:** `feat/shooting` · **Owns:** `src/shooting.js` + `test/shooting.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
Decide what a shot hits: cast a ray from the player, find the nearest zombie whose body the
ray crosses **before** any wall, apply damage, and report the score. Pure, world-space.

## Contract — you MUST export (exact)
```js
shootRay(map, px, py, dx, dy, zombies, opts = {}) -> { zombie, t } | null
   // nearest zombie (body radius ≈ 0.4) hit at ray param t>0, BEFORE the wall; else null
resolveShot(map, player, zombies, weapon) -> { zombies, scoreDelta, killedId }
   // fire along player's facing; apply weapon.damage to the hit zombie; compute score
applyDamage(zombie, dmg) -> zombie'            // immutable; hp = max(0, hp-dmg)
scoreForHit(zombie, killed) -> killed ? 60 : 10
```
Use `engine.castRay(map, px, py, dx, dy)` for the wall distance (occlusion) and a
ray-vs-circle test for zombies. Nearest valid `t` wins.

## Consumes
`engine.castRay` (exists); `zombie = { x, y, hp }`; `weapon.damage` (from `weapons`).
Use a small fixture for zombies/weapon in tests — do **not** import `weapons`.

## Consumed by
The integration renderer (click/hold-fire → `resolveShot` → update zombies + points + juice).

## Research
Ray–circle intersection (solve `|origin + t·dir − center| = r` for the smaller positive `t`)
and DDA wall distance for occlusion. Adapt the standard formulas — don't invent.

## Test plan (write failing first)
- Two zombies in line → nearest is returned.
- A wall between player and zombie → `null` (occluded).
- A ray that misses → `null`.
- `applyDamage` floors at 0 and is immutable; `scoreForHit` = 10 hit / 60 kill.
- `resolveShot` reduces the right zombie's hp and reports `scoreDelta`/`killedId`.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
