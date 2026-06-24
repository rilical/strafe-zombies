// Perk-a-Cola data and stat effects. Integration handles buying; this module
// only owns perk ids and pure player-state helpers.
const JUGG_ID = "jugg";
const SPEED_COLA_ID = "speedCola";
const DOUBLE_TAP_ID = "doubleTap";
const JUGG_MAX_HP = 250;
const BASE_MAX_HP = 100;
const SPEED_COLA_RELOAD_MULTIPLIER = 0.5;
const DOUBLE_TAP_RPM_MULTIPLIER = 1.33;

export const PERKS = Object.freeze({
  jugg: Object.freeze({ id: JUGG_ID, name: "Juggernog", cost: 2500, color: "#c0392b", badge: "JUG", label: "Juggernog" }),
  speedCola: Object.freeze({ id: SPEED_COLA_ID, name: "Speed Cola", cost: 3000, color: "#2ecc71", badge: "SPD", label: "Speed Cola" }),
  doubleTap: Object.freeze({ id: DOUBLE_TAP_ID, name: "Double Tap", cost: 2000, color: "#e1b12c", badge: "2X", label: "Double Tap" }),
});

/**
 * grantPerk(player, id) -> player'
 *
 * Clones the Set-backed perk inventory before adding the id, so callers can
 * safely keep references to previous player snapshots.
 */
export function grantPerk(player, id) {
  return {
    ...player,
    perks: new Set([...player.perks, id]),
  };
}

/**
 * hasPerk(player, id) -> boolean
 *
 * Checks ownership against the frozen `player.perks` contract: a Set of perk ids.
 */
export function hasPerk(player, id) {
  return player.perks.has(id);
}

/**
 * effectiveMaxHp(player) -> number
 *
 * Juggernog raises the survival cap; integration syncs this value into player.maxHp.
 */
export function effectiveMaxHp(player) {
  return hasPerk(player, JUGG_ID) ? JUGG_MAX_HP : BASE_MAX_HP;
}

/**
 * effectiveReloadMs(player, baseMs) -> number
 *
 * Speed Cola halves the weapon reload duration supplied by the caller.
 */
export function effectiveReloadMs(player, baseMs) {
  return hasPerk(player, SPEED_COLA_ID) ? baseMs * SPEED_COLA_RELOAD_MULTIPLIER : baseMs;
}

/**
 * effectiveRpm(player, baseRpm) -> number
 *
 * Double Tap increases the weapon cadence by the locked v1 multiplier.
 */
export function effectiveRpm(player, baseRpm) {
  return hasPerk(player, DOUBLE_TAP_ID) ? baseRpm * DOUBLE_TAP_RPM_MULTIPLIER : baseRpm;
}

// Canonical display order for the perk HUD row and machine color legend.
const PERK_ORDER = [JUGG_ID, SPEED_COLA_ID, DOUBLE_TAP_ID];

/**
 * perkBadges(player) -> [{ id, color, badge, label }, ...]
 *
 * Returns display metadata for each perk the player owns, in the fixed
 * canonical order [jugg, speedCola, doubleTap]. Accepts player.perks as a
 * Set, an Array, or undefined/missing — all map to a plain membership check.
 */
export function perkBadges(player) {
  const owned = player.perks ? new Set(player.perks) : new Set();
  return PERK_ORDER.filter((id) => owned.has(id)).map((id) => {
    const { color, badge, label } = PERKS[id];
    return { id, color, badge, label };
  });
}
