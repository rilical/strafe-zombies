/**
 * loadout.js — CoD-style two-slot weapon inventory.
 *
 * Tracks which two weapons are held and which is active.
 * Weapon ammo lives in player.ammo[id] elsewhere; this module
 * is pure data — no DOM, no randomness, no side effects.
 */

/**
 * Create a fresh loadout with one starting weapon in slot 0.
 *
 * @param {string} startId - The initial weapon id.
 * @returns {{ slots: [string|null, string|null], active: number }}
 */
export function createLoadout(startId) {
  return { slots: [startId, null], active: 0 };
}

/**
 * Equip a weapon.
 *
 * Rules (in priority order):
 *  1. Already held → make that slot active; replaced = null (no duplicate).
 *  2. A slot is null → fill the first empty slot; make it active; replaced = null.
 *  3. Both slots full → overwrite the ACTIVE slot; replaced = the displaced id.
 *
 * The input loadout is never mutated.
 *
 * @param {{ slots: [string|null, string|null], active: number }} loadout
 * @param {string} id
 * @returns {{ loadout: object, replaced: string|null }}
 */
export function equip(loadout, id) {
  const slots = [...loadout.slots];

  // Rule 1: already held — just switch active to that slot.
  const existing = slots.indexOf(id);
  if (existing !== -1) {
    return { loadout: { slots, active: existing }, replaced: null };
  }

  // Rule 2: first empty slot available.
  const emptyIdx = slots.indexOf(null);
  if (emptyIdx !== -1) {
    slots[emptyIdx] = id;
    return { loadout: { slots, active: emptyIdx }, replaced: null };
  }

  // Rule 3: both full — overwrite the active slot.
  const replaced = slots[loadout.active];
  slots[loadout.active] = id;
  return { loadout: { slots, active: loadout.active }, replaced };
}

/**
 * Swap active weapon to the other slot.
 *
 * Toggles active between 0 and 1 only when the other slot is non-null;
 * otherwise returns an equivalent (new) loadout with active unchanged.
 *
 * @param {{ slots: [string|null, string|null], active: number }} loadout
 * @returns {{ slots: [string|null, string|null], active: number }}
 */
export function swap(loadout) {
  const other = loadout.active === 0 ? 1 : 0;
  const newActive = loadout.slots[other] !== null ? other : loadout.active;
  return { slots: [...loadout.slots], active: newActive };
}

/**
 * Return the weapon id in the active slot (may be null).
 *
 * @param {{ slots: [string|null, string|null], active: number }} loadout
 * @returns {string|null}
 */
export function activeWeapon(loadout) {
  return loadout.slots[loadout.active];
}
