/**
 * viewmodels.js — procedural first-person weapon viewmodel descriptors.
 *
 * Normalised viewmodel space: x,y in [0,1].
 *   (0.5, 1.0) = bottom-centre of the screen; y grows downward.
 *
 * Exported API:
 *   viewmodel(weaponId, frame?) → { shapes, muzzle }
 *
 * frame = { recoil?: 0..1, bob?: {x,y} }
 *   All shape coords and the muzzle shift by bob (default {0,0});
 *   recoil pushes the model down: y += recoil * 0.06.
 *   At the neutral frame (recoil 0, no bob) every coord is within [0,1].
 */

// ---------------------------------------------------------------------------
// Static weapon definitions — neutral-frame, no recoil/bob applied.
// Each entry: { shapes: [...], muzzle: {x,y} }
//
// Shape types:
//   rect: { type:'rect', x, y, w, h, color, [glow] }
//   poly: { type:'poly', points:[[x,y],...], color, [glow] }   (≥3 points)
// ---------------------------------------------------------------------------

const WEAPONS = {

  // ── m1911 ─ compact pistol ────────────────────────────────────────────────
  m1911: {
    shapes: [
      // slide (upper receiver)
      { type: 'rect', x: 0.40, y: 0.68, w: 0.18, h: 0.06, color: '#5a5a5a' },
      // barrel
      { type: 'rect', x: 0.38, y: 0.72, w: 0.22, h: 0.04, color: '#4a4a4a' },
      // grip
      { type: 'rect', x: 0.52, y: 0.74, w: 0.10, h: 0.22, color: '#3a2a1a' },
      // trigger guard
      { type: 'rect', x: 0.52, y: 0.76, w: 0.08, h: 0.05, color: '#5a5a5a' },
    ],
    muzzle: { x: 0.38, y: 0.74 },
  },

  // ── kar98k ─ long bolt-action rifle ───────────────────────────────────────
  kar98k: {
    shapes: [
      // barrel (long)
      { type: 'rect', x: 0.05, y: 0.72, w: 0.68, h: 0.04, color: '#5a5a5a' },
      // receiver body
      { type: 'rect', x: 0.45, y: 0.70, w: 0.28, h: 0.08, color: '#4a4a4a' },
      // wooden stock
      { type: 'rect', x: 0.62, y: 0.76, w: 0.28, h: 0.18, color: '#5c3d1e' },
      // bolt handle
      { type: 'rect', x: 0.60, y: 0.68, w: 0.04, h: 0.10, color: '#3a3a3a' },
    ],
    muzzle: { x: 0.05, y: 0.74 },
  },

  // ── carbine ─ mid-length semi-auto rifle ──────────────────────────────────
  carbine: {
    shapes: [
      // barrel
      { type: 'rect', x: 0.15, y: 0.72, w: 0.48, h: 0.04, color: '#5a5a5a' },
      // body / receiver
      { type: 'rect', x: 0.42, y: 0.70, w: 0.28, h: 0.10, color: '#4a4a4a' },
      // box magazine
      { type: 'rect', x: 0.50, y: 0.80, w: 0.08, h: 0.14, color: '#3a3a3a' },
      // wooden stock
      { type: 'rect', x: 0.60, y: 0.76, w: 0.25, h: 0.18, color: '#5c3d1e' },
    ],
    muzzle: { x: 0.15, y: 0.74 },
  },

  // ── thompson ─ drum-magazine SMG ──────────────────────────────────────────
  thompson: {
    shapes: [
      // barrel (short + compensator)
      { type: 'rect', x: 0.15, y: 0.72, w: 0.18, h: 0.06, color: '#5a5a5a' },
      // body / receiver
      { type: 'rect', x: 0.30, y: 0.70, w: 0.34, h: 0.12, color: '#4a4a4a' },
      // drum magazine (distinctive)
      { type: 'rect', x: 0.36, y: 0.82, w: 0.20, h: 0.14, color: '#3a3a3a' },
      // wooden stock
      { type: 'rect', x: 0.58, y: 0.76, w: 0.22, h: 0.18, color: '#5c3d1e' },
      // pistol grip
      { type: 'rect', x: 0.58, y: 0.82, w: 0.10, h: 0.14, color: '#4a2e10' },
    ],
    muzzle: { x: 0.15, y: 0.75 },
  },

  // ── trench ─ double-barrel shotgun ────────────────────────────────────────
  trench: {
    shapes: [
      // top barrel
      { type: 'rect', x: 0.18, y: 0.70, w: 0.40, h: 0.04, color: '#5a5a5a' },
      // bottom barrel
      { type: 'rect', x: 0.18, y: 0.75, w: 0.40, h: 0.04, color: '#4a4a4a' },
      // receiver
      { type: 'rect', x: 0.50, y: 0.72, w: 0.18, h: 0.10, color: '#3a3a3a' },
      // wooden stock (wide, distinctive sawn-off look)
      { type: 'rect', x: 0.58, y: 0.78, w: 0.26, h: 0.16, color: '#5c3d1e' },
    ],
    muzzle: { x: 0.18, y: 0.72 },
  },

  // ── bar ─ Browning Automatic Rifle, big LMG with bipod ────────────────────
  bar: {
    shapes: [
      // heavy barrel
      { type: 'rect', x: 0.05, y: 0.72, w: 0.58, h: 0.05, color: '#5a5a5a' },
      // body / receiver
      { type: 'rect', x: 0.38, y: 0.70, w: 0.34, h: 0.12, color: '#4a4a4a' },
      // top-loading magazine (distinctive bar profile)
      { type: 'rect', x: 0.46, y: 0.62, w: 0.10, h: 0.10, color: '#3a3a3a' },
      // bipod leg left
      { type: 'rect', x: 0.10, y: 0.77, w: 0.03, h: 0.14, color: '#3a3a3a' },
      // bipod leg right
      { type: 'rect', x: 0.20, y: 0.77, w: 0.03, h: 0.14, color: '#3a3a3a' },
      // wooden stock
      { type: 'rect', x: 0.65, y: 0.78, w: 0.25, h: 0.16, color: '#5c3d1e' },
    ],
    muzzle: { x: 0.05, y: 0.745 },
  },

  // ── raygun ─ bulbous emerald sci-fi pistol with glowing core + fins ───────
  raygun: {
    shapes: [
      // slender barrel
      { type: 'rect', x: 0.22, y: 0.72, w: 0.18, h: 0.06, color: '#1aaa52' },
      // bulbous body
      { type: 'rect', x: 0.38, y: 0.65, w: 0.22, h: 0.22, color: '#27e06a' },
      // glowing inner core (emissive)
      { type: 'rect', x: 0.44, y: 0.71, w: 0.10, h: 0.10, color: '#aaffcc', glow: true },
      // top fin
      { type: 'poly',
        points: [[0.58, 0.65], [0.64, 0.57], [0.66, 0.67]],
        color: '#1aaa52' },
      // bottom fin
      { type: 'poly',
        points: [[0.58, 0.87], [0.66, 0.90], [0.64, 0.80]],
        color: '#1aaa52' },
      // handle / grip
      { type: 'rect', x: 0.48, y: 0.87, w: 0.08, h: 0.09, color: '#0d7a3a' },
    ],
    muzzle: { x: 0.22, y: 0.75 },
  },

};

// ---------------------------------------------------------------------------
// viewmodel(weaponId, frame?) → { shapes, muzzle }
// ---------------------------------------------------------------------------

/**
 * Return a procedural first-person viewmodel descriptor for the given weapon.
 *
 * @param {string} weaponId  — one of the seven supported ids
 * @param {object} [frame]   — { recoil?: 0..1, bob?: {x,y} }
 * @returns {{ shapes: object[], muzzle: {x:number, y:number} }}
 * @throws {RangeError} if weaponId is not recognised
 */
export function viewmodel(weaponId, frame = {}) {
  const def = WEAPONS[weaponId];
  if (!def) throw new RangeError(`Unknown weapon id: "${weaponId}"`);

  const recoil = frame.recoil ?? 0;
  const bob    = frame.bob ?? { x: 0, y: 0 };
  const dx = bob.x;
  const dy = bob.y + recoil * 0.06;

  // Deep-clone shapes and apply offset so each call is independent.
  const shapes = def.shapes.map(s => {
    if (s.type === 'rect') {
      return { ...s, x: s.x + dx, y: s.y + dy };
    }
    // poly — clone points array
    return { ...s, points: s.points.map(([px, py]) => [px + dx, py + dy]) };
  });

  const muzzle = { x: def.muzzle.x + dx, y: def.muzzle.y + dy };

  return { shapes, muzzle };
}
