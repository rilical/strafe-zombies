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
  trench: Object.freeze({
    id: "trench",
    name: "Trench Gun",
    damage: 220,
    rpm: 75,
    magSize: 6,
    reserve: 48,
    reloadMs: 2600,
    auto: false,
    price: 1500,
  }),
  bar: Object.freeze({
    id: "bar",
    name: "B.A.R.",
    damage: 75,
    rpm: 500,
    magSize: 20,
    reserve: 200,
    reloadMs: 3000,
    auto: true,
    price: 1800,
  }),
  // Wonder weapon — box-only, uses projectiles.js for splash damage.
  raygun: Object.freeze({
    id: "raygun",
    name: "Ray Gun",
    damage: 1000,
    rpm: 120,
    magSize: 20,
    reserve: 160,
    reloadMs: 2500,
    auto: false,
    price: 0,
    boxOnly: true,
    projectile: true,
    splash: 2.0,
    boltSpeed: 12,
    boltRange: 18,
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

// Attempts one shot from a composed weapon-state object `{id, mag, reserve, ...}`.
// `player.ammo[id]` stays id-free; callers add `id: player.weapon` at this seam.
// `opts.rpm` overrides the cadence rate (e.g. perks.effectiveRpm for Double Tap); the
// numbers otherwise stay locked to the WEAPONS table.
export function fire(weaponState, nowMs, opts = {}) {
  const weapon = weaponFor(weaponState.id);
  const cadenceMs = 60000 / (opts.rpm ?? weapon.rpm);
  const coolingDown = weaponState.lastShotMs !== undefined
    && nowMs - weaponState.lastShotMs < cadenceMs;

  if (weaponState.mag <= 0 || weaponState.reloadTimer !== undefined || coolingDown) {
    return { state: { ...weaponState }, didFire: false };
  }

  return {
    state: { ...weaponState, mag: weaponState.mag - 1, lastShotMs: nowMs },
    didFire: true,
  };
}

// Starts a reload timer when there is room in the magazine and ammo in reserve.
// `opts.reloadMs` overrides the reload duration (e.g. perks.effectiveReloadMs for Speed Cola).
export function startReload(weaponState, nowMs, opts = {}) {
  const weapon = weaponFor(weaponState.id);
  if (
    weaponState.reloadTimer !== undefined
    || weaponState.mag >= weapon.magSize
    || weaponState.reserve <= 0
  ) {
    return { ...weaponState };
  }

  return { ...weaponState, reloadTimer: nowMs + (opts.reloadMs ?? weapon.reloadMs) };
}

// Completes a pending reload once its timer has elapsed, clamping transfer to mag size.
export function tickReload(weaponState, nowMs) {
  const weapon = weaponFor(weaponState.id);
  if (weaponState.reloadTimer === undefined || nowMs < weaponState.reloadTimer) {
    return { ...weaponState };
  }

  const { reloadTimer, ...readyState } = weaponState;
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

// Internal: grant a weapon at full ammo without any purchase restriction checks.
function grantWeapon(player, id) {
  return {
    ...player,
    weapon: id,
    ammo: {
      ...(player.ammo ?? {}),
      [id]: fullAmmoFor(id),
    },
  };
}

// Grants and equips a wall weapon at full ammo. Points are handled by economy.spend.
// Throws a RangeError for boxOnly weapons (e.g. raygun) — those come only from the box.
export function buyWallWeapon(player, id) {
  const weapon = weaponFor(id);
  if (weapon.boxOnly) {
    throw new RangeError(`${id} is a box-only weapon and cannot be wall-bought`);
  }
  return grantWeapon(player, id);
}

// Mystery box pool with weights. m1911 stays as a wall-only starter; raygun is rare.
const BOX_POOL = Object.freeze([
  { id: "kar98k",  weight: 4 },
  { id: "carbine", weight: 4 },
  { id: "thompson",weight: 4 },
  { id: "trench",  weight: 4 },
  { id: "bar",     weight: 4 },
  { id: "raygun",  weight: 1 }, // ~4.8% — wonder weapon is deliberately rare
]);
const BOX_TOTAL_WEIGHT = BOX_POOL.reduce((s, e) => s + e.weight, 0); // 21

// Rolls a weapon from the weighted box pool using an injected rng() in [0,1).
// Always deterministic for a given rng sequence; never returns m1911.
export function rollMysteryBox(player, rng) {
  let pick = rng() * BOX_TOTAL_WEIGHT;
  let weaponId = BOX_POOL[BOX_POOL.length - 1].id; // fallback to last entry
  for (const entry of BOX_POOL) {
    pick -= entry.weight;
    if (pick <= 0) { weaponId = entry.id; break; }
  }
  return { player: grantWeapon(player, weaponId), weaponId };
}
