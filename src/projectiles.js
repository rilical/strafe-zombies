// Generic projectile module. The Ray Gun is the first caller; any future projectile
// weapon can use the same interface. All functions are pure — they return new objects
// and never mutate their inputs.

/**
 * Spawn a new bolt travelling along `angle` (radians) with the given weapon stats.
 * @param {number} x        World-space origin X (map cells).
 * @param {number} y        World-space origin Y (map cells).
 * @param {number} angle    Direction in radians; vx = cos(angle)*speed, vy = sin(angle)*speed.
 * @param {object} weapon   Must have: boltSpeed, boltRange, damage, splash.
 * @returns {object} Immutable-safe bolt descriptor.
 */
export function spawnBolt(x, y, angle, weapon) {
  return {
    x,
    y,
    vx: Math.cos(angle) * weapon.boltSpeed,
    vy: Math.sin(angle) * weapon.boltSpeed,
    damage: weapon.damage,
    splash: weapon.splash,
    speed: weapon.boltSpeed,
    range: weapon.boltRange,
    traveled: 0,
    dead: false,
  };
}

/**
 * Advance a bolt by `dt` seconds. Returns a new bolt; marks `dead:true` when
 * the bolt has traveled at least its `range`.
 */
export function stepBolt(bolt, dt) {
  const traveled = bolt.traveled + bolt.speed * dt;
  return {
    ...bolt,
    x: bolt.x + bolt.vx * dt,
    y: bolt.y + bolt.vy * dt,
    traveled,
    dead: traveled >= bolt.range,
  };
}

/**
 * Returns true when the bolt's current map cell is blocked.
 * Cell coordinates are Math.floor of the bolt's world position.
 * @param {object} bolt
 * @param {function} isBlocked  (cellX: number, cellY: number) => boolean
 */
export function boltHitsWall(bolt, isBlocked) {
  return isBlocked(Math.floor(bolt.x), Math.floor(bolt.y));
}

/**
 * Find all zombies within `bolt.splash` cells of the bolt and compute their damage.
 * Damage uses linear falloff: full at the center, zero at the splash radius.
 *
 * @param {object}   bolt     Current bolt position with `.x`, `.y`, `.damage`, `.splash`.
 * @param {object[]} zombies  Array of `{ id, x, y }` descriptors.
 * @returns {{ id, dist, damage }[]} Only entries where dist <= splash; never negative damage.
 */
export function splashTargets(bolt, zombies) {
  const results = [];
  for (const zombie of zombies) {
    const dist = Math.hypot(zombie.x - bolt.x, zombie.y - bolt.y);
    if (dist <= bolt.splash) {
      results.push({
        id: zombie.id,
        dist,
        damage: Math.max(0, bolt.damage * (1 - dist / bolt.splash)),
      });
    }
  }
  return results;
}
