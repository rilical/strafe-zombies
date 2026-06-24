// props.js — in-world buyable billboard descriptors (pure; no DOM/canvas/timers).
//
// worldProps(level, world) reads level.perkMachines, level.box, and level.mounts
// and returns an array of prop descriptors for index.html to billboard-render.
// Machines are ALWAYS present — they never disappear after purchase.
//
// propSprite(kind, palette, frame) returns a normalized draw-band list for one
// machine billboard.  index.html scales it to the on-screen billboard rect and
// applies fog / flash.
//
// palette convention:
//   • single hex string (perk machines) — used as both body and glow tint.
//   • two-element hex array [base, accent] (box and mounts).

// Frozen per-perkId display metadata — matches docs/plans/0006 frozen table.
const PERK_META = {
  jugg:      { palette: '#c0392b', label: 'Juggernog'  },
  speedCola: { palette: '#2ecc71', label: 'Speed Cola'  },
  doubleTap: { palette: '#e1b12c', label: 'Double Tap'  },
};

/**
 * worldProps(level, world) → Array<{ kind, id, x, y, palette, label, glow }>
 *
 * Returns one descriptor per buyable machine visible in the 3D world.
 * x, y are the cell-centre (cx + 0.5, cy + 0.5) so index.html can
 * billboard-sort props with zombies and corpses.
 *
 * Output order (deterministic): perks → box → mounts.
 */
export function worldProps(level, _world) {
  const props = [];

  // Perk-a-Cola machines — one per level.perkMachines entry.
  for (const m of level.perkMachines) {
    const meta = PERK_META[m.perkId];
    props.push({
      kind:    'perk',
      id:      m.id,
      x:       m.cx + 0.5,
      y:       m.cy + 0.5,
      palette: meta.palette,   // single hex; accent = same tint on glow panel
      label:   meta.label,
      glow:    true,
    });
  }

  // Mystery Box — always at level.box cell.
  props.push({
    kind:    'box',
    id:      'box',
    x:       level.box.cx + 0.5,
    y:       level.box.cy + 0.5,
    palette: ['#6b4f2a', '#caa15a'], // [wood base, gold accent]
    label:   '?',
    glow:    true,
  });

  // Wall-gun mounts — label is the weapon id so the HUD/buy prompt can display it.
  // The mount cell itself is solid wall, so the billboard is pushed half a cell out along
  // faceX/faceY onto the wall face the player actually sees (mirrors how index.html places
  // boarded-window planks). Without this the prop renders inside its own wall and the
  // depth test hides it.
  for (const m of level.mounts) {
    props.push({
      kind:    'mount',
      id:      m.id,
      x:       m.cx + 0.5 + (m.faceX ?? 0) * 0.5,
      y:       m.cy + 0.5 + (m.faceY ?? 0) * 0.5,
      palette: ['#2b2f36', '#6b7280'], // [gunmetal base, steel accent]
      label:   m.weaponId,
      glow:    false,
    });
  }

  return props;
}

/**
 * propSprite(kind, palette, frame) → { bands: Array<{uMin,uMax,vMin,vMax,color}> }
 *
 * Normalized billboard draw-list in [0,1]^2 (u left→right, v top→bottom).
 * index.html scales this to the on-screen billboard rect and applies fog/flash.
 *
 * Three layers for every kind:
 *   1. machine body rectangle (base color, full silhouette)
 *   2. front panel / glow window (accent, inset)
 *   3. label plate (dark strip near bottom)
 * For 'mount' the panel is a horizontal gun-silhouette bar instead of a glow screen.
 *
 * @param {string}          kind    'perk' | 'box' | 'mount'
 * @param {string|string[]} palette hex or [base, accent] array
 * @param {object}          frame   reserved for future animation offsets (unused now)
 */
export function propSprite(kind, palette, _frame = {}) {
  const base   = Array.isArray(palette) ? palette[0] : palette;
  const accent = Array.isArray(palette) ? palette[1] : palette;

  if (kind === 'perk') {
    // Tall vending-machine silhouette.
    return {
      bands: [
        // Body — full silhouette
        { uMin: 0.05, uMax: 0.95, vMin: 0.05, vMax: 0.95, color: base   },
        // Glowing front panel (inset, large — the glow is the visual hook)
        { uMin: 0.15, uMax: 0.85, vMin: 0.10, vMax: 0.70, color: accent },
        // Label plate at bottom
        { uMin: 0.10, uMax: 0.90, vMin: 0.72, vMax: 0.88, color: '#1a1a1a' },
      ],
    };
  }

  if (kind === 'box') {
    // Wooden crate with a glowing question-mark window.
    return {
      bands: [
        // Crate body
        { uMin: 0.05, uMax: 0.95, vMin: 0.20, vMax: 0.95, color: base   },
        // Glowing question-mark window
        { uMin: 0.20, uMax: 0.80, vMin: 0.28, vMax: 0.72, color: accent },
        // Label strip at bottom
        { uMin: 0.10, uMax: 0.90, vMin: 0.78, vMax: 0.90, color: '#1a1a1a' },
      ],
    };
  }

  // 'mount' — wall-mounted gun rack: backing plate + gun-bar silhouette + label.
  return {
    bands: [
      // Backing plate
      { uMin: 0.05, uMax: 0.95, vMin: 0.10, vMax: 0.90, color: base   },
      // Gun-silhouette bar (horizontal, center strip)
      { uMin: 0.10, uMax: 0.90, vMin: 0.35, vMax: 0.55, color: accent },
      // Label strip at bottom
      { uMin: 0.10, uMax: 0.90, vMin: 0.70, vMax: 0.85, color: '#1a1a1a' },
    ],
  };
}
