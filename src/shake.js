/**
 * tickShake — decay trauma over time by decay*dt, floor at 0.
 * @param {number} trauma - Current trauma value
 * @param {number} dt - Delta time (seconds)
 * @param {number} decay - Decay rate (default 1.5)
 * @returns {number} Updated trauma, never negative
 */
export function tickShake(trauma, dt, decay = 1.5) {
  return Math.max(0, trauma - decay * dt);
}

/**
 * shakeOffset — produce screen shake pixel offset from trauma².
 * Trauma is squared to give shake a "juicy" feel that intensifies with impact.
 * @param {number} trauma - Current trauma value [0, 1], clamped by callers
 * @param {number} maxPx - Maximum pixel offset
 * @param {Function} rng - Random function (default Math.random), called twice (x, y)
 * @returns {{x: number, y: number}} Pixel offset for canvas translation
 */
export function shakeOffset(trauma, maxPx, rng = Math.random) {
  const amt = trauma * trauma * maxPx;
  if (amt === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: amt * (rng() * 2 - 1),
    y: amt * (rng() * 2 - 1),
  };
}
