// Feel-tunable speed and lifetime ranges for each particle type.
// Sparks are faster and shorter-lived than blood puffs for visual contrast.
const BLOOD_SPEED_MIN = 1.0;
const BLOOD_SPEED_MAX = 4.0;
const BLOOD_TTL_MIN   = 0.3;
const BLOOD_TTL_MAX   = 0.7;

const SPARK_SPEED_MIN = 4.0;
const SPARK_SPEED_MAX = 9.0;
const SPARK_TTL_MIN   = 0.1;
const SPARK_TTL_MAX   = 0.3;

/**
 * spawnBurst — shared internal helper that creates n new particles at (x,y) and
 * appends them to list, returning a new array.
 *
 * Each particle consumes exactly 3 rng() calls in fixed order:
 *   1. angle  = rng() * 2π           (full circle, radians; dir = (cosθ, sinθ))
 *   2. speed  = speedMin + rng() * (speedMax - speedMin)
 *   3. ttl    = ttlMin  + rng() * (ttlMax  - ttlMin)
 * Fixed call count ensures determinism with a seeded/stub rng.
 *
 * @param {Array}    list     - Current particle list (not mutated)
 * @param {number}   x        - Spawn X (world units)
 * @param {number}   y        - Spawn Y (world units)
 * @param {number}   n        - Number of particles to spawn
 * @param {Function} rng      - RNG function returning [0,1)
 * @param {Object}   cfg      - { speedMin, speedMax, ttlMin, ttlMax }
 * @returns {Array} New list with n particles appended
 */
function spawnBurst(list, x, y, n, rng, cfg) {
  const { speedMin, speedMax, ttlMin, ttlMax } = cfg;
  const newParticles = [];
  for (let i = 0; i < n; i++) {
    const angle = rng() * 2 * Math.PI;                      // draw 1
    const speed = speedMin + rng() * (speedMax - speedMin); // draw 2
    const ttl   = ttlMin   + rng() * (ttlMax   - ttlMin);  // draw 3
    newParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed, // engine convention: dir = (cosθ, sinθ)
      vy: Math.sin(angle) * speed,
      age: 0,
      ttl,
    });
  }
  return [...list, ...newParticles];
}

/**
 * spawnBloodPuff — spawn n blood particles at (x,y).
 * Slow, longer-lived; used on zombie hit.
 *
 * @param {Array}    list  - Current particle list (not mutated)
 * @param {number}   x     - World X
 * @param {number}   y     - World Y
 * @param {number}   n     - Particle count (default 8)
 * @param {Function} rng   - RNG (default Math.random)
 * @returns {Array} New list with n blood particles appended
 */
export function spawnBloodPuff(list, x, y, n = 8, rng = Math.random) {
  return spawnBurst(list, x, y, n, rng, {
    speedMin: BLOOD_SPEED_MIN,
    speedMax: BLOOD_SPEED_MAX,
    ttlMin:   BLOOD_TTL_MIN,
    ttlMax:   BLOOD_TTL_MAX,
  });
}

/**
 * spawnSpark — spawn n spark particles at (x,y).
 * Fast, short-lived; used on wall ricochet.
 *
 * @param {Array}    list  - Current particle list (not mutated)
 * @param {number}   x     - World X
 * @param {number}   y     - World Y
 * @param {number}   n     - Particle count (default 6)
 * @param {Function} rng   - RNG (default Math.random)
 * @returns {Array} New list with n spark particles appended
 */
export function spawnSpark(list, x, y, n = 6, rng = Math.random) {
  return spawnBurst(list, x, y, n, rng, {
    speedMin: SPARK_SPEED_MIN,
    speedMax: SPARK_SPEED_MAX,
    ttlMin:   SPARK_TTL_MIN,
    ttlMax:   SPARK_TTL_MAX,
  });
}

/**
 * tickParticles — advance all particles by dt and cull expired ones.
 *
 * Integration: velocity only (no gravity or drag — the renderer handles visual fade).
 *   x   += vx * dt
 *   y   += vy * dt
 *   age += dt
 * Cull condition: age >= ttl.
 *
 * Returns a new array of new entry objects; inputs are never mutated.
 *
 * @param {Array}  list - Current particle list
 * @param {number} dt   - Delta time in seconds
 * @returns {Array} Updated list with dead particles removed
 */
export function tickParticles(list, dt) {
  return list
    .map(p => ({
      ...p,
      x:   p.x + p.vx * dt,
      y:   p.y + p.vy * dt,
      age: p.age + dt,
    }))
    .filter(p => p.age < p.ttl);
}
