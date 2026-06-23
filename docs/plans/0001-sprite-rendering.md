# 0001 — Sprite rendering (billboarded, depth-correct)

**Status:** in progress — `src/sprites.js` implemented + tested; `index.html` wiring pending

## Goal
Draw a world-space sprite (the first zombie) as a flat billboard that always faces the
camera and is correctly occluded by walls — partially hidden when it stands behind a
pillar, fully hidden when a wall is in front of it. This is the visual foundation every
later zombie feature builds on.

## Approach
Add a small **pure** module `src/sprites.js` with `projectSprite(player, FOV, W, H, sprite)`
and a `projectSprites(player, FOV, W, H, sprites)` companion (test-first). Given the player
camera (position + facing; `plane = (-dirY, dirX)·FOV`) and a sprite world position, it
returns the screen-space transform the renderer needs:

- `depth` — distance along the camera's forward axis (the sprite's "perpendicular"
  distance, directly comparable to the wall `perpWallDist` that `castRay` already
  returns).
- `screenX` — horizontal center of the billboard, in **pixels** (`≈ W/2` dead ahead).
- `scale` — full on-screen billboard height in pixels (`∝ H / depth`).
- `drawStartY` / `drawEndY` — the vertical band, clamped to `[0, H]` (floor to rows).
- `visible` — `false` when `depth <= 0` (sprite at/behind the camera; skip drawing).

`projectSprites` maps over many sprites, keeps the visible ones, sorts them far → near
(painter's algorithm), and tags each with a `sprite` back-reference to its source entity.

The renderer in `index.html` keeps a **per-column depth buffer** (the `perpWallDist` of
each vertical wall slice it already computes), then draws the sprite column-by-column,
skipping any column where `depth >= wallDepth[column]`. Pure projection math lives in
`src/` and is tested; the canvas drawing stays as thin, untested glue.

**Out of scope:** sprite sheets or animation, zombie movement (chase AI already exists in
`src/game.js`), damage, and the canvas drawing itself. The projection math (including
multi-sprite z-sorting) is done in `src/sprites.js`; one depth-correct billboard wired into
`index.html` is the remaining integration milestone.

## Test first
In `test/sprites.test.js`, pin down `projectSprite` before writing it:

- A sprite directly ahead projects to screen center (`screenX ≈ W/2`) with `depth`
  equal to its straight-line distance.
- A sprite off to one side projects left/right of center accordingly.
- A sprite behind the camera reports `visible === false` (and is not drawn).
- `depth` is directly comparable to `castRay(...).perpWallDist`: a sprite farther than
  the wall in its column is occluded; nearer is visible. (Assert the depth relationship,
  not pixels.)
- Closer sprites yield a larger `scale` than farther ones.

## Done when
- [x] `npm test` green, including the new `projectSprite`/`projectSprites` cases.
- [ ] `index.html` draws one billboard, depth-clipped against the wall buffer.
- [ ] `docs/architecture.md` notes the sprite/depth-buffer flow; `src/sprites.js` is
      commented for a reader.
