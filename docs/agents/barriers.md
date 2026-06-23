# Agent: barriers — doors & boarded windows overlay

**Branch:** `feat/barriers` · **Owns:** `src/barriers.js` + `test/barriers.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The mutable overlay on top of the static `LEVEL`: which debris doors are open and how many
boards each window still has. The single source of "can something pass through this cell?".

## Contract — you MUST export (exact)
```js
createWorld(level) -> { doors:{ [id]:false }, windows:{ [id]:MAX_BOARDS } }  // MAX_BOARDS = 6
openDoor(world, id) -> world'                 // doors[id] = true
repairBoard(world, winId) -> world'           // boards = min(MAX_BOARDS, boards+1)
tearBoard(world, winId) -> world'             // boards = max(0, boards-1)
isBlocked(level, world, cx, cy) -> boolean    // wall, OR a closed debris door's cell
```
All immutable. `isBlocked` returns true for a base grid wall or any cell belonging to a debris
door that is still closed; a bought (open) door's cells become passable.

**Debris overrides the static grid.** The `level` module draws debris as solid rubble (grid
value `3`) so the raycaster renders a closed door as a wall. `isBlocked` therefore checks
debris-door membership *before* the grid-wall test: a debris cell's passability is governed
entirely by its door (closed → blocked, open → passable), regardless of its non-zero grid
value. This is the override that makes buying a door actually open the path — without it, an
opened door's rubble cells would stay blocked and the purchase would be a no-op.

## Consumes
`LEVEL` shape (frozen — see [`README.md`](README.md)). Use a small `LEVEL` fixture in tests;
do **not** import the real `level` module.

## Consumed by
`pathfind` (`isBlocked` for walkable cells), integration (movement/collision, render boards).

## Research
None.

## Test plan (write failing first)
- `createWorld` → all doors closed, every window at 6 boards.
- `openDoor` / `repairBoard` / `tearBoard` clamp correctly and are immutable.
- `isBlocked`: true for a wall cell and a closed-debris cell; false for an empty cell and for
  that debris cell after `openDoor`.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
