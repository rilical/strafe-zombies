# Agent: sprites — billboard sprite projection

**Branch:** `feat/sprites` · **Owns:** `src/sprites.js` + `test/sprites.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.
This agent fulfils the existing [`docs/plans/0001-sprite-rendering.md`](../plans/0001-sprite-rendering.md).

## Mission
Turn world-space sprites (zombies, drops, the Box) into screen positions and scales, sorted
back-to-front, so the renderer can draw depth-correct billboards. Pure math; drawing and the
per-column wall depth buffer stay in `index.html`.

## Contract — you MUST export (exact)
```js
projectSprite(player, FOV, W, H, sprite) ->
   { screenX, scale, drawStartY, drawEndY, depth, visible }   // visible:false if behind camera
projectSprites(player, FOV, W, H, sprites) -> Array            // projected, visible, sorted far→near
```
Use the engine camera convention: `dir = (cos angle, sin angle)`,
`plane = (-dirY, dirX) * FOV`. Transform a sprite via the inverse of `[plane | dir]`; `depth`
is the transformed forward distance; `scale ∝ H/depth`. Match `src/engine.js` conventions.

## Consumes
Engine camera math only (no import needed beyond conventions). Plain `sprite = { x, y, ... }`.

## Consumed by
The integration renderer (draws billboards, depth-clipping each column against `perpWallDist`).
`decals` mirrors this projection math.

## Research
Lode Vandevenne's raycaster **sprite casting** (the standard inverse-camera-matrix method).
Don't invent a projection — adapt that one.

## Test plan (write failing first)
- A sprite dead ahead → `screenX ≈ W/2`; `depth ≈` straight-line distance.
- `scale` is inversely proportional to `depth` (closer → bigger).
- A sprite behind the camera → `visible:false`.
- `projectSprites` returns far→near order (painter's algorithm).

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
