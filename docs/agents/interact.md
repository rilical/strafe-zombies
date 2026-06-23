# Agent: interact — buyable proximity & use-prompt resolution

**Branch:** `feat/interact` · **Owns:** `src/interact.js` + `test/interact.test.js` ·
**Status:** brief-ready

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The "walk up and hold F" layer. Given the player's position and the level, decide **which
single buyable** (wall-gun mount, Mystery Box, Perk-a-Cola machine, or debris door) the
player is close enough to use right now — so `index.html` never embeds the rule for *what
can I buy here?*. Pure geometry + filtering. You do **not** spend points, grant weapons, or
open doors — the integration agent composes those from `economy`/`weapons`/`perks`/`barriers`
once the player confirms.

## Contract — you MUST export (exact)
```js
export const BOX_COST = 950;        // Mystery Box price (Nacht); LEVEL.box carries no cost
export const INTERACT_RADIUS = 1.6; // cells; player-centre -> buyable cell-centre

// The nearest in-range, still-available buyable, or null. Pure; never mutates inputs.
findInteractable(level, world, player) -> Interactable | null
```
`Interactable` is one of (every variant carries `kind`, `id`, `cost`, `cx`, `cy`, `dist`):
```js
{ kind:'mount',  id, cost, weaponId,  cx, cy, dist }   // from level.mounts[]
{ kind:'box',    id:'box', cost:BOX_COST, cx, cy, dist } // from level.box
{ kind:'perk',   id, cost, perkId,    cx, cy, dist }   // from level.perkMachines[]
{ kind:'debris', id, cost, opensRoom, cx, cy, dist }   // from level.debris[]; nearest cell
```

## Rules
- `dist` is Euclidean from `(player.x, player.y)` to a cell **centre** `(cx+0.5, cy+0.5)`.
- Consider every mount, the box, every perk machine, and every debris group. For a debris
  group with several `cells`, use its **nearest** cell as that candidate's `(cx,cy)`/`dist`.
- **Filter out unavailable buyables:** a debris door already open (`world.doors[id] === true`)
  and a perk the player already owns (`player.perks.has(perkId)`) are skipped entirely.
- Return the single candidate with the smallest `dist` that is **≤ INTERACT_RADIUS**, else
  `null`. Boundary is inclusive. Ties (equal `dist`) resolve deterministically in category
  order `mount, box, perk, debris`, then by `id`.
- Be defensive: `world` may be `undefined`/partial — treat a missing `doors` map as
  none-open. A level with no `box`, no `debris`, or no `mounts` must not throw; skip that
  category. `player.perks` may be a `Set` or absent (absent → owns nothing).
- Pure: **no imports of other `src/` modules**, no DOM, inputs never mutated.

## Consumes
The `LEVEL` shape (`mounts` / `box` / `perkMachines` / `debris`), `world.doors`, and
`player.{x, y, perks}` (all frozen in README). Build tiny **local fixtures** in your tests —
do **not** import `level` or `barriers`.

## Consumed by
The integration agent: it renders the HUD "Press F to buy …" prompt from the returned record
and composes the actual purchase (`economy.spend` + `weapons`/`perks`/`barriers`) on the F key.

## Research
None — a use-distance check is a simple radius test. Match the cell/centre conventions used
in `src/engine.js` (`(cx+0.5, cy+0.5)` centres, world units = cells).

## Test plan (write failing first)
- Player far from everything → `null`.
- Player adjacent to one mount → returns that mount with its `weaponId` and `cost`.
- Two buyables in range → returns the nearer; assert the tie-break order when `dist` is equal.
- Debris: a blocked door in range is returned; once `world.doors[id] === true` it is skipped.
- Perk machine in range is returned; once `player.perks.has(perkId)` it is skipped.
- Multi-cell debris uses its nearest cell; a candidate at exactly `INTERACT_RADIUS` is included.
- Immutability: `level`, `world`, and `player` are unchanged after the call.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
