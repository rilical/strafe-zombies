// Perk-a-Cola data and stat effects. Integration handles buying; this module
// only owns perk ids and pure player-state helpers.
export const PERKS = Object.freeze({
  jugg: Object.freeze({ id: "jugg", name: "Juggernog", cost: 2500 }),
  speedCola: Object.freeze({ id: "speedCola", name: "Speed Cola", cost: 3000 }),
  doubleTap: Object.freeze({ id: "doubleTap", name: "Double Tap", cost: 2000 }),
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
  return hasPerk(player, "jugg") ? 250 : 100;
}

/**
 * effectiveReloadMs(player, baseMs) -> number
 *
 * Speed Cola halves the weapon reload duration supplied by the caller.
 */
export function effectiveReloadMs(player, baseMs) {
  return hasPerk(player, "speedCola") ? baseMs * 0.5 : baseMs;
}

/**
 * effectiveRpm(player, baseRpm) -> number
 *
 * Double Tap increases the weapon cadence by the locked v1 multiplier.
 */
export function effectiveRpm(player, baseRpm) {
  return hasPerk(player, "doubleTap") ? baseRpm * 1.33 : baseRpm;
}
