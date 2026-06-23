// Data-driven weapon table. The numbers stay locked to the zombies survival plan;
// perk-adjusted rpm/reload values are supplied by callers, not this module.
export const WEAPONS = Object.freeze({
  m1911: Object.freeze({
    id: "m1911",
    name: "M1911",
    damage: 40,
    rpm: 350,
    magSize: 8,
    reserve: 80,
    reloadMs: 1500,
    auto: false,
    price: 0,
  }),
  kar98k: Object.freeze({
    id: "kar98k",
    name: "Kar98k",
    damage: 100,
    rpm: 90,
    magSize: 5,
    reserve: 50,
    reloadMs: 2200,
    auto: false,
    price: 200,
  }),
  carbine: Object.freeze({
    id: "carbine",
    name: "Carbine",
    damage: 50,
    rpm: 360,
    magSize: 15,
    reserve: 120,
    reloadMs: 1800,
    auto: false,
    price: 600,
  }),
  thompson: Object.freeze({
    id: "thompson",
    name: "Thompson",
    damage: 35,
    rpm: 700,
    magSize: 30,
    reserve: 240,
    reloadMs: 2400,
    auto: true,
    price: 1200,
  }),
});

function weaponFor(id) {
  const weapon = WEAPONS[id];
  if (!weapon) throw new RangeError(`Unknown weapon id: ${id}`);
  return weapon;
}

function fullAmmoFor(id) {
  const weapon = weaponFor(id);
  return { mag: weapon.magSize, reserve: weapon.reserve };
}

// Attempts one shot from a weapon-state object `{id, mag, reserve, lastShotMs?}`.
// Returns `{state,didFire}` and never mutates the input state.
export function fire(weaponState, nowMs) {
  const weapon = weaponFor(weaponState.id);
  const cadenceMs = 60000 / weapon.rpm;
  const coolingDown = weaponState.lastShotMs !== undefined
    && nowMs - weaponState.lastShotMs < cadenceMs;

  if (weaponState.mag <= 0 || weaponState.reloadEndMs !== undefined || coolingDown) {
    return { state: { ...weaponState }, didFire: false };
  }

  return {
    state: { ...weaponState, mag: weaponState.mag - 1, lastShotMs: nowMs },
    didFire: true,
  };
}

// Starts a reload timer when there is room in the magazine and ammo in reserve.
export function startReload(weaponState, nowMs) {
  const weapon = weaponFor(weaponState.id);
  if (
    weaponState.reloadEndMs !== undefined
    || weaponState.mag >= weapon.magSize
    || weaponState.reserve <= 0
  ) {
    return { ...weaponState };
  }

  return { ...weaponState, reloadEndMs: nowMs + weapon.reloadMs };
}

// Completes a pending reload once its timer has elapsed, clamping transfer to mag size.
export function tickReload(weaponState, nowMs) {
  const weapon = weaponFor(weaponState.id);
  if (weaponState.reloadEndMs === undefined || nowMs < weaponState.reloadEndMs) {
    return { ...weaponState };
  }

  const { reloadEndMs, ...readyState } = weaponState;
  const roundsNeeded = Math.max(0, weapon.magSize - weaponState.mag);
  const roundsLoaded = Math.min(roundsNeeded, weaponState.reserve);
  return {
    ...readyState,
    mag: weaponState.mag + roundsLoaded,
    reserve: weaponState.reserve - roundsLoaded,
  };
}

// Max Ammo helper for one weapon state. Callers apply it across owned weapons.
export function refillAmmo(weaponState) {
  const weapon = weaponFor(weaponState.id);
  return { ...weaponState, mag: weapon.magSize, reserve: weapon.reserve };
}

// Grants and equips a wall weapon at full ammo. Points are handled by economy.spend.
export function buyWallWeapon(player, id) {
  return {
    ...player,
    weapon: id,
    ammo: {
      ...(player.ammo ?? {}),
      [id]: fullAmmoFor(id),
    },
  };
}

// Rolls a weapon from the data table using an injected rng() in [0,1), then grants it.
export function rollMysteryBox(player, rng) {
  const weaponIds = Object.keys(WEAPONS);
  const roll = rng();
  const index = Math.min(Math.floor(roll * weaponIds.length), weaponIds.length - 1);
  const weaponId = weaponIds[index];
  return { player: buyWallWeapon(player, weaponId), weaponId };
}
