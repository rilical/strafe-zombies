# Agent: economy — points: earn, spend, payouts

**Branch:** `feat/economy` · **Owns:** `src/economy.js` + `test/economy.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The pure points wallet for the whole game: earn on hits/kills, spend on guns/doors/Box/perks.
Immutable, never goes negative. Everything that costs or pays points goes through you.

## Contract — you MUST export (exact)
```js
earn(player, n) -> player'                 // points += n (n >= 0); new object, input untouched
spend(player, cost) -> { ok, player }      // points>=cost ? {ok:true, points-=cost} : {ok:false, unchanged}
pointsForHit() -> 10
pointsForKill({ melee = false } = {}) -> melee ? 130 : 60
```
Invariants: pure, immutable, `points` never `< 0`, `spend` failure leaves player identical.

## Consumes
`player.points` (frozen shape). No other module.

## Consumed by
`shooting` (payouts), `weapons`/`barriers`/`perks` (purchases via integration), `powerups`
(Nuke award, Double Points), the HUD.

## Research
None — values are locked in the plan's *Faithful constants* block.

## Test plan (write failing first)
- `earn` adds; input object unchanged (immutability).
- `spend` success deducts; `spend` with insufficient points returns `ok:false` and the
  original player unchanged; result never negative.
- `pointsForHit` = 10; `pointsForKill()` = 60; `pointsForKill({melee:true})` = 130.

## Definition of done
Contract met · tests thorough + green · `npm test` green · commented · self-contained PR ·
report to integration agent.
