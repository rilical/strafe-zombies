/**
 * zombieArt.js — procedural zombie decal sprite descriptor
 *
 * Exports two pure functions used by index.html's drawZombies():
 *   zombieSprite(seed)         -> deterministic look descriptor
 *   zombieBands(sprite, phase) -> normalized draw-list + sway
 *
 * Normalized sprite space: u in [0,1] left→right, v in [0,1] top→bottom
 * (v=0 is the head end, v=1 is feet). No DOM, no canvas, no Math.random,
 * no imports from other src/ modules.
 */

// ---------------------------------------------------------------------------
// Deterministic hash — mulberry32 seeded with a single integer
// ---------------------------------------------------------------------------

/**
 * Returns a seeded PRNG function that yields floats in [0, 1).
 * Uses the mulberry32 algorithm — fast, portable, zero state leakage.
 * @param {number} seed - integer seed
 * @returns {() => number}
 */
function mkRng(seed) {
  // Mix seed through a splitmix-style step so seed=0 isn't degenerate
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/**
 * Map a float in [0,1) to an integer in [lo, hi] inclusive.
 * @param {number} r - random float
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function randInt(r, lo, hi) {
  return lo + Math.floor(r * (hi - lo + 1));
}

// ---------------------------------------------------------------------------
// zombieSprite — deterministic look descriptor
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic zombie appearance from an integer seed.
 *
 * Skin tones are weighted toward muted greens/greys (undead palette).
 * Clothing colours vary across the full spectrum so each zombie looks unique.
 * Variant flags are independently drawn with low (~25%) probability so that
 * on average most zombies look normal but a spread of mutants appears over
 * a full horde.
 *
 * @param {number} seed - integer (e.g. zombie id)
 * @returns {{ skin:[r,g,b], shirt:[r,g,b], pants:[r,g,b],
 *             variant:{ missingArm:boolean, exposedRibs:boolean, bloody:boolean } }}
 */
export function zombieSprite(seed) {
  const rng = mkRng(seed | 0);

  // Undead skin: desaturated greens / greys / yellowed flesh
  const skinHues = [
    [120, 140, 100], // pale green-grey
    [180, 170, 140], // yellowed flesh
    [ 90, 110,  80], // mossy grey-green
    [160, 150, 120], // sallow beige
    [100, 120,  90], // army green-grey
    [130, 145, 110], // muted sage
  ];
  const baseSkin = skinHues[randInt(rng(), 0, skinHues.length - 1)];
  // Add a small per-zombie jitter so seeds produce slightly different tones
  const skin = baseSkin.map((c) => Math.min(255, Math.max(0,
    c + randInt(rng(), -20, 20)
  )));

  // Shirt: full-spectrum but dark/desaturated (WWII era clothing)
  const shirt = [
    randInt(rng(), 20, 180),
    randInt(rng(), 20, 180),
    randInt(rng(), 20, 180),
  ];

  // Pants: typically darker than shirt
  const pants = [
    randInt(rng(), 10, 120),
    randInt(rng(), 10, 120),
    randInt(rng(), 10, 120),
  ];

  // Variant flags — each independently ~25% likely
  const missingArm  = rng() < 0.25;
  const exposedRibs = rng() < 0.25;
  const bloody      = rng() < 0.25;

  return {
    skin,
    shirt,
    pants,
    variant: { missingArm, exposedRibs, bloody },
  };
}

// ---------------------------------------------------------------------------
// zombieBands — animated draw-list
// ---------------------------------------------------------------------------

/**
 * Layout constants (all in normalised sprite space).
 * The figure is stacked head→feet (v increases downward).
 */
const V_HEAD_TOP    = 0.00;
const V_HEAD_BOT    = 0.18;
const V_TORSO_TOP   = 0.18;
const V_TORSO_BOT   = 0.50;
const V_LEGS_TOP    = 0.50;
const V_LEGS_BOT    = 1.00;

const U_BODY_MIN    = 0.25;
const U_BODY_MAX    = 0.75;

// Arms hang to the sides of the torso
const U_ARM_L_MIN   = 0.05;
const U_ARM_L_MAX   = 0.28;
const U_ARM_R_MIN   = 0.72;
const U_ARM_R_MAX   = 0.95;

// Blood-spatter overlay over the torso
const GORE_COLOR    = [180, 10, 10];   // dark red
const RIB_COLOR     = [220, 200, 170]; // bone-white

/**
 * Clamp a value to [0, 1].
 * @param {number} v
 * @returns {number}
 */
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Build the animated band list for a zombie.
 *
 * Shamble animation: `phase` (radians, e.g. derived from game time * speed)
 * drives a sine oscillation on the arm/leg u-offsets and a small head bob on
 * the v coordinate. `sway` is a horizontal body lean derived from the same sine.
 *
 * All output coords are clamped to [0, 1].
 *
 * @param {{ skin, shirt, pants, variant }} sprite - from zombieSprite()
 * @param {number} phase - animation phase in radians
 * @returns {{ sway:number, bands:Array<{layer,uMin,uMax,vMin,vMax,color:[r,g,b]}> }}
 */
export function zombieBands(sprite, phase) {
  const { skin, shirt, pants, variant } = sprite;

  // Shamble oscillation — pure trig, no random
  const swing     = Math.sin(phase);          // -1…+1, main gait cycle
  const swingAlt  = Math.sin(phase + Math.PI);// opposite phase for opposite limb
  const bob       = Math.sin(phase * 2) * 0.015; // head bob (v offset)
  const sway      = swing * 0.04;             // horizontal body lean

  // Arm horizontal swing: amplitude 0.06 in u-space
  const ARM_SWING = 0.06;
  const legSwing  = 0.04; // leg u-shift amplitude

  const bands = [];

  // --- Head ---
  const headVMin = clamp01(V_HEAD_TOP + bob);
  const headVMax = clamp01(V_HEAD_BOT + bob);
  bands.push({
    layer: "head",
    uMin: U_BODY_MIN,
    uMax: U_BODY_MAX,
    vMin: headVMin,
    vMax: headVMax,
    color: skin,
  });

  // --- Torso / shirt ---
  bands.push({
    layer: "torso",
    uMin: U_BODY_MIN,
    uMax: U_BODY_MAX,
    vMin: V_TORSO_TOP,
    vMax: V_TORSO_BOT,
    color: shirt,
  });

  // A separate "shirt" band is the same region but labelled for completeness;
  // omit to avoid duplication — the 'torso' band carries the shirt colour.

  // --- Arms ---
  // Left arm swings forward when right leg goes back (opposite phase)
  const leftArmShift  = swingAlt * ARM_SWING;
  const rightArmShift = swing    * ARM_SWING;

  if (!variant.missingArm) {
    // Both arms present
    bands.push({
      layer: "arm",
      uMin: clamp01(U_ARM_L_MIN + leftArmShift),
      uMax: clamp01(U_ARM_L_MAX + leftArmShift),
      vMin: V_TORSO_TOP,
      vMax: V_TORSO_BOT,
      color: skin,
    });
    bands.push({
      layer: "arm",
      uMin: clamp01(U_ARM_R_MIN + rightArmShift),
      uMax: clamp01(U_ARM_R_MAX + rightArmShift),
      vMin: V_TORSO_TOP,
      vMax: V_TORSO_BOT,
      color: skin,
    });
  } else {
    // Only the right arm (stump look — left torn off)
    bands.push({
      layer: "arm",
      uMin: clamp01(U_ARM_R_MIN + rightArmShift),
      uMax: clamp01(U_ARM_R_MAX + rightArmShift),
      vMin: V_TORSO_TOP,
      vMax: V_TORSO_BOT,
      color: skin,
    });
  }

  // --- Legs / pants (two side-by-side sub-bands to show gait) ---
  const leftLegShift  = swing    * legSwing;
  const rightLegShift = swingAlt * legSwing;

  // Left leg
  bands.push({
    layer: "legs",
    uMin: clamp01(U_BODY_MIN + leftLegShift),
    uMax: clamp01(0.50       + leftLegShift),
    vMin: V_LEGS_TOP,
    vMax: V_LEGS_BOT,
    color: pants,
  });
  // Right leg
  bands.push({
    layer: "legs",
    uMin: clamp01(0.50        + rightLegShift),
    uMax: clamp01(U_BODY_MAX  + rightLegShift),
    vMin: V_LEGS_TOP,
    vMax: V_LEGS_BOT,
    color: pants,
  });

  // --- Gore overlays (only when variant flags are set) ---
  if (variant.exposedRibs) {
    // Rib cage strip across the mid-torso
    bands.push({
      layer: "gore",
      uMin: U_BODY_MIN + 0.05,
      uMax: U_BODY_MAX - 0.05,
      vMin: V_TORSO_TOP + 0.10,
      vMax: V_TORSO_TOP + 0.22,
      color: RIB_COLOR,
    });
  }

  if (variant.bloody) {
    // Blood spatter: upper torso and head region
    bands.push({
      layer: "gore",
      uMin: U_BODY_MIN + 0.02,
      uMax: U_BODY_MAX - 0.02,
      vMin: V_HEAD_BOT,
      vMax: V_TORSO_TOP + 0.15,
      color: GORE_COLOR,
    });
  }

  return { sway, bands };
}
