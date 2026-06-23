// Billboard sprite projection — pure, dependency-free, and testable.
//
// Turns a world-space sprite (a zombie, a power-up drop, the Mystery Box) into
// the screen-space transform the renderer needs to draw it as a flat billboard
// that always faces the camera and sits at the correct depth. All pixel drawing
// and the per-column wall depth buffer stay in index.html; this module is only
// the projection math, so it can be unit-tested in Node (via vitest).
//
// It adapts Lode Vandevenne's raycaster "sprite casting": transform the sprite
// into camera space with the inverse of the [plane | dir] matrix. Camera
// conventions match src/engine.js:
//   dir   = (cos angle, sin angle)
//   plane = (-dirY, dirX) * FOV          // +plane is screen-right
// With that plane, det([plane | dir]) = -FOV, so the inverse is exact and the
// transformed forward axis (`depth`) reduces to dot(spriteRel, dir) — the same
// fisheye-free distance castRay returns as perpWallDist. That lets the renderer
// depth-clip a sprite column-by-column against the wall buffer.

// Project one world-space sprite into screen space for the given camera.
//
//   player : { x, y, angle, ... }   camera position + facing (radians)
//   FOV    : plane half-width factor (the plane's length); larger ⇒ wider view
//   W, H   : canvas size in pixels
//   sprite : { x, y, ... }          world position (extra fields ignored)
//
// Returns { screenX, scale, drawStartY, drawEndY, depth, visible }:
//   depth      forward distance along the camera axis (compare to perpWallDist)
//   screenX    horizontal centre of the billboard, in pixels (0..W)
//   scale      full on-screen height in pixels (∝ H / depth)
//   drawStartY top edge / drawEndY bottom edge of the billboard, clamped [0, H]
//   visible    false when the sprite is at or behind the camera plane —
//              in that case only `depth` and `visible` are meaningful.
export function projectSprite(player, FOV, W, H, sprite) {
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  // Camera plane, perpendicular to dir; its length (FOV) sets the field of view.
  const planeX = -dirY * FOV;
  const planeY = dirX * FOV;

  // Sprite position relative to the camera.
  const relX = sprite.x - player.x;
  const relY = sprite.y - player.y;

  // Multiply by the inverse of the camera matrix [planeX dirX; planeY dirY].
  //   invDet = 1 / (planeX·dirY − dirX·planeY) = −1 / FOV
  // `depth` is the distance into the screen; `transformX` is the lateral offset.
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const transformX = invDet * (dirY * relX - dirX * relY);
  const depth = invDet * (-planeY * relX + planeX * relY); // ≡ dirX·relX + dirY·relY

  // At or behind the camera plane there is nothing to draw.
  if (depth <= 0) {
    return { screenX: NaN, scale: 0, drawStartY: 0, drawEndY: 0, depth, visible: false };
  }

  // Horizontal centre: shift from mid-screen by the lateral/forward ratio.
  const screenX = (W / 2) * (1 + transformX / depth);

  // Billboard height shrinks with depth; centre the band on the horizon and
  // clamp its vertical extent to the canvas (the renderer floors these to rows).
  const scale = H / depth;
  const drawStartY = Math.max(0, H / 2 - scale / 2);
  const drawEndY = Math.min(H, H / 2 + scale / 2);

  return { screenX, scale, drawStartY, drawEndY, depth, visible: true };
}

// Project many sprites, keep only those in front of the camera, and sort them
// far → near (painter's algorithm) so the renderer can draw back-to-front. Each
// result spreads the projectSprite fields and adds a `sprite` back-reference to
// the source entity, so the caller knows what to draw for each projection.
// Pure: the input array and its sprites are read, never mutated.
export function projectSprites(player, FOV, W, H, sprites) {
  return sprites
    .map((sprite) => ({ ...projectSprite(player, FOV, W, H, sprite), sprite }))
    .filter((projected) => projected.visible)
    .sort((a, b) => b.depth - a.depth);
}
