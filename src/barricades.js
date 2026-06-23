/**
 * barricades.js — window board-tearing mechanic (pure, no DOM, no imports)
 *
 * Owns the TIMING, GEOMETRY and SELECTION logic for the boarded-window system.
 * Zombies rip planks off windows to climb in; the player re-nails them for
 * points. Actual board-count state lives in `barriers.js` (world.windows[id]);
 * this module operates on plain data handed to it by the caller.
 */

/** Seconds a zombie spends ripping each plank from a window. */
export const TEAR_SECS = 1.2;

/** Maximum number of planks a window can hold. */
export const MAX_BOARDS = 6;

/** Points awarded to the player for re-nailing one plank. */
export const REPAIR_REWARD = 10;

/** Maximum Euclidean cell distance for the player to repair a window. */
export const REACH = 1.6;

/**
 * Returns the world-space centre points for the walkable cell just inside and
 * just outside a window wall.
 *
 * The window's border cell is (cx, cy).  faceX/faceY is the unit inward normal
 * pointing INTO the room, so:
 *   inside  = the cell the zombie climbs INTO  = (cx+faceX, cy+faceY)
 *   outside = the cell the zombie walks FROM   = (cx-faceX, cy-faceY)
 * Cells are centred by adding 0.5 to each coordinate.
 *
 * Pure — does not mutate `win`.
 *
 * @param {{ cx:number, cy:number, faceX:number, faceY:number }} win
 * @returns {{ inside:{x:number,y:number}, outside:{x:number,y:number} }}
 */
export function windowPoints(win) {
  return {
    inside:  { x: win.cx + win.faceX + 0.5, y: win.cy + win.faceY + 0.5 },
    outside: { x: win.cx - win.faceX + 0.5, y: win.cy - win.faceY + 0.5 },
  };
}

/**
 * Chooses the window a newly-spawned shambler will attack.
 *
 * Strategy: prefer windows that still have boards (world.windows[id] > 0)
 * so zombies cluster on weaker spots. If every window is already open (0
 * boards), fall back to picking uniformly from all windows. Within the
 * chosen set, pick uniformly using the provided rng function.
 *
 * Pure — does not mutate `windows` or `world`.
 *
 * @param {Array<{id:string}>}  windows  - array of window descriptors
 * @param {{ windows:{[id:string]:number} }} world - overlay with board counts
 * @param {()=>number}          rng      - returns [0, 1); default Math.random
 * @returns {object|null}  a window object from the array, or null if empty
 */
export function pickWindow(windows, world, rng = Math.random) {
  if (windows.length === 0) return null;

  // Collect the preferred set: windows that still have planks.
  const boarded = windows.filter(w => (world.windows[w.id] ?? 0) > 0);

  // Fall back to all windows when every window is already torn open.
  const pool = boarded.length > 0 ? boarded : windows;

  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Advances the board-ripping clock for one zombie that is actively tearing at
 * a window.  The caller owns the mutable world state; this function is pure
 * and returns new values without modifying anything.
 *
 * Algorithm: accumulate `tearTimer + dt`, then repeatedly consume `tearSecs`
 * while there are boards remaining, counting each consumed interval as one
 * plank torn off.  Once the zombie has stripped the last plank (boards hit 0),
 * the timer is reset to 0 and `broken` is set to true — the caller should
 * remove the zombie from the "breaking" list and move it to chasing.
 *
 * @param {number} tearTimer  - accumulated time since last plank tear (seconds)
 * @param {number} boards     - current plank count for this window (read-only)
 * @param {number} dt         - elapsed game time this frame (seconds)
 * @param {number} tearSecs   - override for TEAR_SECS (default: TEAR_SECS)
 * @returns {{ tearTimer:number, tears:number, broken:boolean }}
 */
export function tickBreak(tearTimer, boards, dt, tearSecs = TEAR_SECS) {
  let t = tearTimer + dt;
  let remaining = boards; // local counter — caller owns actual state
  let tears = 0;

  // Pop one plank per full tearSecs interval, stopping when out of planks.
  // A tiny epsilon guards against floating-point accumulation drift (e.g.
  // 1.2 * 3 = 3.5999… so the third iteration must still fire).
  const EPS = 1e-9;
  while (t >= tearSecs - EPS && remaining > 0) {
    t -= tearSecs;
    remaining -= 1;
    tears += 1;
  }

  // Once the window is fully torn open, there is no partial timer to preserve.
  const broken = remaining === 0 && tears > 0;
  return {
    tearTimer: broken ? 0 : t,
    tears,
    broken,
  };
}

/**
 * Finds the nearest window that the player can reach and still needs planks.
 *
 * A window qualifies when:
 *   1. Its board count (world.windows[id]) is strictly less than MAX_BOARDS.
 *   2. The Euclidean distance from the player to the window's wall-cell centre
 *      (cx + 0.5, cy + 0.5) is ≤ `reach`.
 *
 * Among qualifying windows, the closest one is returned. Returns null when no
 * window qualifies.
 *
 * Pure — does not mutate `level`, `world`, or `player`.
 *
 * @param {{ windows: Array<{id:string, cx:number, cy:number}> }} level
 * @param {{ windows:{[id:string]:number} }} world
 * @param {{ x:number, y:number }} player
 * @param {number} reach  - maximum allowed distance (default: REACH)
 * @returns {object|null}
 */
export function findRepairableWindow(level, world, player, reach = REACH) {
  let nearest = null;
  let bestDist = Infinity;

  for (const win of level.windows) {
    // Skip windows that are already at full boards — nothing to re-nail.
    if ((world.windows[win.id] ?? 0) >= MAX_BOARDS) continue;

    // Wall-cell centre in world space.
    const cx = win.cx + 0.5;
    const cy = win.cy + 0.5;
    const dx = player.x - cx;
    const dy = player.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= reach && dist < bestDist) {
      bestDist = dist;
      nearest = win;
    }
  }

  return nearest;
}
