/**
 * walltex.js — procedural per-room wall texture sampler
 *
 * Provides deterministic per-pixel colour for four wall themes so each of the
 * four quadrants of the 16×16 map reads as a distinct surface.  All patterns
 * are derived from a tiny integer hash of quantised (u, v) coordinates — no
 * Math.random, no imports, no DOM.
 *
 * Exports
 *   wallShade(theme, side, u, v) → [r, g, b]
 *   themeForCell(cx, cy)         → theme string
 */

// ── hash ─────────────────────────────────────────────────────────────────────

/**
 * Tiny deterministic integer hash.  Maps two non-negative integers to a value
 * in [0, 1).  Uses the classic Wang hash mix; no floats until the final step.
 */
function hash2(a, b) {
  // Fold b into a with a prime multiply, then Wang-hash the result.
  let h = (a * 2654435761 + b * 1234567891) >>> 0; // keep 32-bit uint
  h = ((h ^ (h >>> 16)) * 0x45d9f3b) >>> 0;
  h = ((h ^ (h >>> 16)) * 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 0x100000000; // [0, 1)
}

/**
 * Quantise a float in [0,1] to an integer grid of `steps` cells, then hash
 * with a second coordinate integer.
 */
function noise(u, v, stepsU, stepsV, seed) {
  const iu = Math.min(Math.floor(u * stepsU), stepsU - 1);
  const iv = Math.min(Math.floor(v * stepsV), stepsV - 1);
  return hash2(iu + seed * 97, iv + seed * 53);
}

// ── clamp / dim ───────────────────────────────────────────────────────────────

function clamp255(x) { return Math.max(0, Math.min(255, Math.round(x))); }

/** Apply the E/W face darkening (side === 1). */
function applyDim(rgb, side) {
  if (side === 0) return rgb;
  return [clamp255(rgb[0] * 0.7), clamp255(rgb[1] * 0.7), clamp255(rgb[2] * 0.7)];
}

// ── theme samplers ────────────────────────────────────────────────────────────

/**
 * Brick: horizontal mortar courses with staggered vertical joints.
 * Course height = 1/5 of the wall → 5 courses visible end-to-end.
 * Mortar band occupies the bottom ~14 % of each course.
 * Vertical joints stagger between even/odd courses.
 */
function sampleBrick(u, v) {
  const courses = 5;
  const courseV = v * courses;
  const courseIdx = Math.floor(courseV); // which course row (0-based)
  const withinV = courseV - courseIdx;   // [0,1) inside this course

  // Mortar band at the top of each course (withinV > 0.86)
  const mortarV = withinV > 0.86;

  // Horizontal joints: stagger by 0.5 for odd courses
  const jointPeriod = 0.5;
  const offset = (courseIdx % 2 === 0) ? 0 : 0.25;
  const uShifted = (u + offset) % 1.0;
  const withinU = (uShifted % jointPeriod) / jointPeriod; // [0,1) within one brick
  const mortarU = withinU < 0.05 || withinU > 0.95;       // thin vertical joint

  const isMortar = mortarV || mortarU;

  // Fine grain noise on the brick face
  const grain = noise(u, v, 40, 40, 1) * 18 - 9; // ±9

  if (isMortar) {
    // Pale grey mortar
    const m = clamp255(160 + grain * 0.5);
    return [m, m, m];
  }
  // Warm red brick body; slight brick-to-brick colour variation
  const brickVar = (noise(u, v, 10, courses, 7) - 0.5) * 30;
  const r = clamp255(178 + brickVar + grain);
  const g = clamp255(68  + brickVar * 0.4 + grain * 0.5);
  const b = clamp255(52  + brickVar * 0.2);
  return [r, g, b];
}

/**
 * Planks: vertical plank seams (4 planks across the wall) + subtle grain.
 * Seam occupies the leftmost ~5 % of each plank column.
 */
function samplePlanks(u, v) {
  const planks = 4;
  const plankU = u * planks;
  const withinU = plankU - Math.floor(plankU); // [0,1) inside one plank

  const seam = withinU < 0.05;

  // Vertical grain noise
  const grain = noise(u, v, planks * 8, 60, 3) * 22 - 11;

  if (seam) {
    // Dark seam
    return [clamp255(55 + grain * 0.4), clamp255(35 + grain * 0.3), clamp255(20)];
  }
  // Brown plank body; per-plank tint variation
  const plankVar = (noise(u, v, planks, 1, 11) - 0.5) * 24;
  const r = clamp255(139 + plankVar + grain);
  const g = clamp255(90  + plankVar * 0.6 + grain * 0.7);
  const b = clamp255(43  + plankVar * 0.2 + grain * 0.3);
  return [r, g, b];
}

/**
 * Concrete: low-amplitude grey mottle; no strong periodic structure.
 * Uses two overlapping noise scales for a slight lumpy texture.
 */
function sampleConcrete(u, v) {
  const coarse = noise(u, v, 8, 8, 5) * 28 - 14;   // ±14
  const fine   = noise(u, v, 24, 24, 13) * 10 - 5;  // ±5
  const base = 140;
  const c = clamp255(base + coarse + fine);
  // Very slight warm-grey tint
  return [clamp255(c + 4), clamp255(c + 2), c];
}

/**
 * Blood: concrete-grey base with dark-red streaks running down the wall.
 * Streaks are thin (narrow u bands), tall (large v extent), irregularly placed
 * via the hash so they appear at fixed positions.
 */
function sampleBlood(u, v) {
  // Start from the concrete base
  const [cr, cg, cb] = sampleConcrete(u, v);

  // 6 potential streak columns; only those whose hash > 0.55 are "active"
  const streakCount = 6;
  let streakStrength = 0;
  for (let s = 0; s < streakCount; s++) {
    // Centre of streak in u
    const centre = hash2(s * 31, 17);          // fixed position per streak index
    const width  = 0.04 + hash2(s * 31, 99) * 0.04; // 0.04–0.08
    const dist = Math.abs(u - centre);
    if (dist < width) {
      // Streak fades toward edges; only in the lower 80 % of the wall
      const edgeFade = 1 - dist / width;
      const topFade  = Math.min(1, v / 0.2);   // fade in from top
      streakStrength = Math.max(streakStrength, edgeFade * topFade * 0.85);
    }
  }

  // Give the whole surface a permanent brownish-red tint even without streaks,
  // so blood always reads as distinct from plain concrete.
  const baseTint = 0.18;
  const blend = Math.max(baseTint, streakStrength);
  const r = clamp255(cr * (1 - blend) + 90  * blend);
  const g = clamp255(cg * (1 - blend) + 8   * blend);
  const b = clamp255(cb * (1 - blend) + 8   * blend);
  return [r, g, b];
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Sample a wall-surface point and return its RGB colour.
 *
 * @param {string} theme  One of 'brick' | 'concrete' | 'planks' | 'blood'
 * @param {0|1}    side   0 = N/S face (brighter), 1 = E/W face (~0.7× darker)
 * @param {number} u      Horizontal position along the wall, in [0, 1]
 * @param {number} v      Vertical position up the wall, in [0, 1]
 * @returns {[number,number,number]}  [r, g, b] each an integer in [0, 255]
 */
export function wallShade(theme, side, u, v) {
  let rgb;
  switch (theme) {
    case 'brick':    rgb = sampleBrick(u, v);    break;
    case 'planks':   rgb = samplePlanks(u, v);   break;
    case 'concrete': rgb = sampleConcrete(u, v); break;
    case 'blood':    rgb = sampleBlood(u, v);    break;
    default:         rgb = sampleConcrete(u, v); break;
  }
  return applyDim(rgb, side);
}

/**
 * Map a map cell coordinate to one of the four wall themes by quadrant of the
 * 16×16 map.
 *
 *   NW (cx<8,  cy<8)  → 'brick'
 *   NE (cx>=8, cy<8)  → 'concrete'
 *   SW (cx<8,  cy>=8) → 'planks'
 *   SE (cx>=8, cy>=8) → 'blood'
 *
 * @param {number} cx  Cell x coordinate (0–15)
 * @param {number} cy  Cell y coordinate (0–15)
 * @returns {string}
 */
export function themeForCell(cx, cy) {
  if (cx < 8 && cy < 8)  return 'brick';
  if (cx >= 8 && cy < 8) return 'concrete';
  if (cx < 8 && cy >= 8) return 'planks';
  return 'blood';
}
