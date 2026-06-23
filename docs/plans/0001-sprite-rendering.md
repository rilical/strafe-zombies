# 0001 — Sprite rendering (billboarded, depth-correct)

**Status:** planned

## Goal
Draw a world-space sprite (the first zombie) as a flat billboard that always faces the
camera and is correctly occluded by walls — partially hidden when it stands behind a
pillar, fully hidden when a wall is in front of it. This is the visual foundation every
later zombie feature builds on.

## Approach
Add a small **pure** module `src/sprites.js` with a `projectSprite(player, sprite)`
function (test-first). Given the player camera (position + direction + plane) and a
sprite world position, it returns the camera-space transform the renderer needs:

- `depth` — distance along the camera's forward axis (the sprite's "perpendicular"
  distance, directly comparable to the wall `perpWallDist` that `castRay` already
  returns).
- `screenX` — horizontal center of the sprite in normalized screen space.
- `scale` — projected size factor (so the renderer can derive on-screen width/height).
- `behind` — true when `depth <= 0` (sprite is behind the camera; skip drawing).

The renderer in `index.html` keeps a **per-column depth buffer** (the `perpWallDist` of
each vertical wall slice it already computes), then draws the sprite column-by-column,
skipping any column where `depth >= wallDepth[column]`. Pure projection math lives in
`src/` and is tested; the canvas drawing stays as thin, untested glue.

**Out of scope:** multiple sprites / z-sorting, sprite sheets or animation, zombie
movement (chase AI already exists in `src/game.js`), damage. One static billboard,
depth-correct. Those are later plans.

## Test first
In `test/sprites.test.js`, pin down `projectSprite` before writing it:

- A sprite directly ahead projects to screen center (`screenX ≈ 0.5`) with `depth`
  equal to its straight-line distance.
- A sprite off to one side projects left/right of center accordingly.
- A sprite behind the camera reports `behind === true` (and is not drawn).
- `depth` is directly comparable to `castRay(...).perpWallDist`: a sprite farther than
  the wall in its column is occluded; nearer is visible. (Assert the depth relationship,
  not pixels.)
- Closer sprites yield a larger `scale` than farther ones.

## Done when
- [ ] `npm test` green, including the new `projectSprite` cases.
- [ ] `index.html` draws one billboard, depth-clipped against the wall buffer.
- [ ] `docs/architecture.md` notes the sprite/depth-buffer flow; `src/sprites.js` is
      commented for a reader.
