# Agent: perks — Perk-a-Cola data + stat multipliers

**Branch:** `feat/perks` · **Owns:** `src/perks.js` + `test/perks.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The three stat Perk-a-Colas. You own the perk IDs and expose **pure multipliers** so
`survival` and `weapons` never branch on perk strings. No downed/revive state (out of scope).

## Contract — you MUST export (exact)
```js
PERKS = {
  jugg:      { id:'jugg',      name:'Juggernog',  cost:2500 },
  speedCola: { id:'speedCola', name:'Speed Cola', cost:3000 },
  doubleTap: { id:'doubleTap', name:'Double Tap', cost:2000 },
}
grantPerk(player, id) -> player'    // immutably add id to player.perks (a Set); idempotent
hasPerk(player, id) -> boolean
effectiveMaxHp(player)              -> hasPerk(jugg)      ? 250 : 100
effectiveReloadMs(player, baseMs)  -> hasPerk(speedCola) ? baseMs * 0.5  : baseMs
effectiveRpm(player, baseRpm)      -> hasPerk(doubleTap) ? baseRpm * 1.33 : baseRpm
```
`player.perks` is a `Set<string>`; clone it on grant (never mutate the input's Set).

## Consumes
`player.perks` (frozen shape). No other module.

## Consumed by
`survival` (via integration syncing `player.maxHp = effectiveMaxHp`), `weapons`
(callers pass base reload/rpm through `effective*`), integration (buy machines, HUD icons).

## Research
None — costs and effects are locked in the plan.

## Test plan (write failing first)
- Each `effective*` with and without its perk (default and boosted values).
- `grantPerk` returns a new player with the id present; input unchanged; granting twice is
  idempotent (no duplicate, still immutable).
- `hasPerk` true/false; `PERKS` costs are 2500 / 3000 / 2000.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
