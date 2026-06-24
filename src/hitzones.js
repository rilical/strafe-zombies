// Pure vertical hit-zone geometry for billboard zombies.
//
// Every zombie is drawn as a flat billboard occupying a clamped vertical
// screen band [drawStartY, drawEndY] (see src/sprites.js projectSprite).
// Its *head* sits in the top fraction of that band — HEAD_TOP..HEAD_BOTTOM
// as proportions of the total billboard height.
//
// A headshot occurs when the crosshair's canvas-y (cursorY) lands inside the
// projected head band of the zombie the bullet already hit.  That decision is
// purely geometric and lives here so it can be unit-tested in isolation.

// Head band defaults: fraction of billboard height from the top.
export const HEAD_TOP    = 0.02; // head band starts this fraction down the billboard
export const HEAD_BOTTOM = 0.30; // ...and ends here (a touch below the drawn head, fair aim)

// True when the crosshair's y falls in the target's projected head band.
//
//   drawStartY, drawEndY : sprite projection's clamped vertical band in canvas px
//                          (from projectSprite; drawEndY >= drawStartY in normal use)
//   cursorY              : crosshair y in canvas px
//   opts.top, opts.bottom: override the band fractions (default HEAD_TOP / HEAD_BOTTOM)
//
// Returns false for degenerate billboards (h <= 0) and when the cursor is
// above the head or below the head band (in the body/legs region).
export function isHeadshot(drawStartY, drawEndY, cursorY, opts = {}) {
  const h = drawEndY - drawStartY;
  if (h <= 0) return false; // nothing drawn or sprite behind camera

  const top = opts.top    ?? HEAD_TOP;
  const bot = opts.bottom ?? HEAD_BOTTOM;

  const topY = drawStartY + h * top;
  const botY = drawStartY + h * bot;

  // Both band edges are inclusive — grazing the boundary counts as a headshot.
  return cursorY >= topY && cursorY <= botY;
}

// True when the crosshair's y falls anywhere inside the target's billboard band
// [drawStartY, drawEndY] — i.e. the shot is vertically on the body, not aimed at the
// ceiling or floor in the same screen column. Both edges inclusive; false for a
// degenerate billboard (h <= 0). Lets the integration reject vertical misses before
// applying the 2D ray/circle damage of shooting.resolveShot.
export function isBodyHit(drawStartY, drawEndY, cursorY) {
  if (drawEndY - drawStartY <= 0) return false;
  return cursorY >= drawStartY && cursorY <= drawEndY;
}
