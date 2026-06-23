# Agent: decals — persistent bullet holes & blood pools

**Branch:** `feat/decals` · **Owns:** `src/decals.js` + `test/decals.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The marks that stay: bullet holes on walls and blood pools on the floor. You own the pooled
list (capped so it never leaks) and the world→screen **projection**; the pixel drawing lives
in `index.html` on top of the textured renderer.

## Contract — you MUST export (exact)
```js
addDecal(list, decal, cap = 64) -> list'   // append; if over cap, evict oldest (pool)
tickDecals(list, dt) -> list'              // age/fade; cull when ttl elapsed (ttl may be Infinity)
projectWallDecal(player, FOV, W, H, decal) -> { screenX, screenY, scale, depth, visible }
projectFloorDecal(player, FOV, W, H, decal) -> { screenX, screenY, scale, depth, visible }
```
Mirror `sprites.js`'s inverse-camera projection for the wall case; floor decals use a
floor-cast (row-based) projection of a ground point. Behind-camera → `visible:false`.

## Consumes
Engine camera math (same conventions as `sprites`). Plain `decal = { x, y, kind, age, ttl }`.

## Consumed by
The integration renderer (PR 13 textured pipeline draws the projected decals).

## Research
Floor-casting (per-row floor projection) and projecting a single world point to a screen
column/row. Reuse the `sprites` projection approach for walls; don't invent new math.

## Test plan (write failing first)
- `addDecal` past `cap` evicts the oldest (pool stays capped).
- `tickDecals` fades/culls finite-ttl decals; `Infinity` ttl persists.
- A decal dead-ahead projects near screen centre; behind-camera → `visible:false`.
- Immutability (new arrays).

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
