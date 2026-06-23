const DROP_CHANCE = 0.03;
const DROP_TTL_SECONDS = 15;
const NUKE_POINTS = 400;
const DEFAULT_TIMER_SECONDS = 30;
const POWER_UP_TYPES = ["nuke", "maxAmmo", "instaKill", "doublePoints"];
const TIMER_TYPES = ["instaKill", "doublePoints"];

const FULL_AMMO = {
  m1911: { mag: 8, reserve: 80 },
  kar98k: { mag: 5, reserve: 50 },
  carbine: { mag: 15, reserve: 120 },
  thompson: { mag: 30, reserve: 240 },
};

function typeFromRoll(roll) {
  const index = Math.min(Math.floor(roll * POWER_UP_TYPES.length), POWER_UP_TYPES.length - 1);
  return POWER_UP_TYPES[index];
}

function requireKnownWeapon(id) {
  const ammo = FULL_AMMO[id];
  if (!ammo) throw new RangeError(`Unknown weapon id: ${id}`);
  return ammo;
}

/**
 * Rolls the classic on-kill power-up chance and returns a floor drop at the zombie position.
 * The injected rng keeps kill resolution deterministic in tests and replayable loops.
 */
export function maybeDrop(zombie, rng = Math.random) {
  if (rng() >= DROP_CHANCE) return null;

  const type = typeFromRoll(rng());
  return {
    id: `powerup-${zombie.id}`,
    type,
    x: zombie.x,
    y: zombie.y,
    ttl: DROP_TTL_SECONDS,
  };
}

/**
 * Advances floor-drop lifetimes and active timed effects without mutating the GameState.
 * Expired floor drops are removed; active timers clamp at zero for straightforward HUD use.
 */
export function tickPowerUps(state, dt) {
  const powerUps = (state.powerUps ?? [])
    .map((drop) => ({ ...drop, ttl: drop.ttl - dt }))
    .filter((drop) => drop.ttl > 0);
  const activePowerUps = Object.fromEntries(
    Object.entries(state.activePowerUps ?? {}).map(([type, seconds]) => [
      type,
      Math.max(0, seconds - dt),
    ]),
  );

  return { ...state, powerUps, activePowerUps };
}

/**
 * Applies the Nuke effect by removing zombies that are still alive and returning its flat
 * point award. Dead entries are preserved so callers can keep any already-finished records.
 */
export function applyNuke(zombies) {
  return {
    zombies: zombies.filter((zombie) => zombie.hp <= 0).map((zombie) => ({ ...zombie })),
    points: NUKE_POINTS,
  };
}

/**
 * Refills every owned weapon in the shared player ammo map, mirroring weapons.refillAmmo
 * by data while keeping this module independent for the parallel build contract.
 */
export function applyMaxAmmo(player) {
  const ammo = Object.fromEntries(
    Object.entries(player.ammo ?? {}).map(([id, weaponAmmo]) => {
      const fullAmmo = requireKnownWeapon(id);
      return [id, { ...weaponAmmo, ...fullAmmo }];
    }),
  );

  return { ...player, ammo };
}

/**
 * Starts or refreshes a timed power-up effect. Only Insta-Kill and Double Points are timers;
 * immediate effects such as Nuke and Max Ammo are applied through their own helpers.
 */
export function activate(active, type, secs = DEFAULT_TIMER_SECONDS) {
  if (!TIMER_TYPES.includes(type)) throw new RangeError(`Unsupported timed power-up: ${type}`);
  return { ...active, [type]: secs };
}
