/**
 * markers.js — compute buyable-object markers for the radar minimap.
 *
 * Pure function: no DOM, no imports from other src/ modules, no side effects.
 * The renderer (index.html) calls buyableMarkers() each frame and draws a glyph
 * at each returned world position.
 *
 * Marker kinds: 'mount' | 'box' | 'perk' | 'door'
 * World coordinates: cell index + 0.5 (centre of the cell).
 */

/**
 * Check whether a player owns a given perkId.
 * player.perks may be a Set, an Array, or undefined.
 *
 * @param {Set|Array|undefined} perks
 * @param {string} perkId
 * @returns {boolean}
 */
function hasPerk(perks, perkId) {
  if (!perks) return false;
  if (perks instanceof Set) return perks.has(perkId);
  return perks.includes(perkId);
}

/**
 * Compute the world-space centroid of a cells array and add 0.5 to each axis.
 * cells is an array of [x, y] integer pairs.
 *
 * @param {Array<[number, number]>} cells
 * @returns {{ x: number, y: number }}
 */
function cellCentroid(cells) {
  const n = cells.length;
  let sumX = 0, sumY = 0;
  for (const [cx, cy] of cells) {
    sumX += cx;
    sumY += cy;
  }
  return { x: sumX / n + 0.5, y: sumY / n + 0.5 };
}

/**
 * Return an array of marker objects for every buyable item that should appear
 * on the radar minimap this frame.
 *
 * Order: mounts (array order) → box → perks (array order) → doors (array order).
 *
 * @param {object} level        - Static level data (mounts, box, perkMachines, debris).
 * @param {object} world        - Dynamic overlay ({ doors, windows }).
 * @param {object} player       - Player state ({ perks: Set|Array|undefined, ... }).
 * @returns {Array<{ id: string, kind: string, x: number, y: number }>}
 */
export function buyableMarkers(level, world, player) {
  const markers = [];

  // --- MOUNTS: always shown ---
  for (const mount of level.mounts ?? []) {
    markers.push({ id: mount.id, kind: 'mount', x: mount.cx + 0.5, y: mount.cy + 0.5 });
  }

  // --- MYSTERY BOX: always shown (skip if absent) ---
  if (level.box) {
    markers.push({ id: 'box', kind: 'box', x: level.box.cx + 0.5, y: level.box.cy + 0.5 });
  }

  // --- PERK MACHINES: hide if player already owns the perk ---
  for (const machine of level.perkMachines ?? []) {
    if (hasPerk(player.perks, machine.perkId)) continue;
    markers.push({ id: machine.id, kind: 'perk', x: machine.cx + 0.5, y: machine.cy + 0.5 });
  }

  // --- DEBRIS DOORS: hide once opened (world.doors[id] === true) ---
  for (const debris of level.debris ?? []) {
    if (world.doors[debris.id] === true) continue;
    const { x, y } = cellCentroid(debris.cells);
    markers.push({ id: debris.id, kind: 'door', x, y });
  }

  return markers;
}
