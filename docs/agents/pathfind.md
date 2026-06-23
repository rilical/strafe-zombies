# Agent: pathfind — flow-field horde navigation

**Branch:** `feat/pathfind` · **Owns:** `src/pathfind.js` + `test/pathfind.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
Steer many zombies toward one player without per-zombie pathfinding: build one flow field
(BFS distance field) from the player's cell, then have each zombie follow it downhill with
wall-slide. **Supersedes** `game.js`'s straight-line `stepZombie` (which gets stuck on corners).

## Contract — you MUST export (exact)
```js
buildFlowField(level, world, col, row) -> Int8Array   // BFS from player cell over walkable cells
flowDir(field, W, col, row) -> { dx, dy }             // unit-ish step toward the player (downhill)
stepZombieAlong(level, world, zombie, field, dt, speed) -> zombie'  // move + wall-slide
```
Walkable = `!barriers.isBlocked(level, world, cx, cy)` (4-connectivity). Model the movement
and wall-slide on the existing `game.js stepZombie` + `engine.moveWithCollision` (per-axis
slide) — **reuse, don't reinvent**.

## Consumes
`engine` (`moveWithCollision`), `LEVEL`/`world` shape, `barriers.isBlocked`. Use fixtures in
tests. **Add `pathfind.js` only — do NOT delete `game.js`**; the integration agent retires it.

## Consumed by
The integration loop (rebuild the field when the player changes cell; step every zombie).

## Research
Grid **flow field / Dijkstra-lite distance field** for many-agents-one-target navigation;
4-connected BFS; wall-slide. Adapt the standard approach.

## Test plan (write failing first)
- The field's values descend toward the player's cell; blocked cells are excluded/sentinel.
- `flowDir` points a cell's neighbour-step toward the player.
- `stepZombieAlong` moves a zombie closer over a tick and **slides** along a wall instead of
  sticking on it.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
