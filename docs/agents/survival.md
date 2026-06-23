# Agent: survival — player health, contact damage, regen, game over

**Branch:** `feat/survival` · **Owns:** `src/survival.js` + `test/survival.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
Keep the player alive or not: apply contact damage from touching zombies, regenerate health
after a quiet moment, and report game over. Pure and immutable.

## Contract — you MUST export (exact)
```js
applyContactDamage(player, dmg, nowMs) -> player'  // hp = max(0, hp-dmg); lastDamageMs = nowMs
regen(player, nowMs) -> player'                     // quiet 2s after lastDamageMs, then refill
                                                    // hp toward player.maxHp over 3s (full ~5s after last hit)
isGameOver(player) -> boolean                       // player.hp <= 0
```
Constants (frozen): base contact damage 50 (two hits down a 100-HP player). Regen quiet delay
`REGEN_DELAY_MS = 2000`, then linear refill to `maxHp` over `REGEN_TO_FULL_MS = 3000` (so a
player is full ~5s after the last hit). Read `player.maxHp` as the cap (Juggernog raises it to
250 — the integration agent sets `maxHp`; **do not import perks**).
Per-zombie attack cooldown lives on `zombie.hitCooldown`, not here.

## Consumes
`player` shape (uses `player.maxHp`). No other module.

## Consumed by
The integration loop (damage on contact, regen each tick, game-over overlay).

## Research
None.

## Test plan (write failing first)
- `applyContactDamage` reduces hp and stamps `lastDamageMs`; floors at 0; immutability.
- Two 50-damage hits → hp 0 → `isGameOver` true.
- `regen` does nothing before `REGEN_DELAY`; after it, refills to `maxHp` over ~5s and never
  exceeds `maxHp`.
- Respect a raised `maxHp` (e.g. 250) when capping regen.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
