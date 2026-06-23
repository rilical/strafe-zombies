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
  jugg: Object.freeze({ id: JUGG_ID, name: "Juggernog", cost: 2500 }),
  speedCola: Object.freeze({ id: SPEED_COLA_ID, name: "Speed Cola", cost: 3000 }),
  doubleTap: Object.freeze({ id: DOUBLE_TAP_ID, name: "Double Tap", cost: 2000 }),
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
