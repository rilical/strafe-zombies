// RISE_RATE: upward float speed in screen pixels per second.
// Popups live in screen-pixel space (spawned at the zombie's projected screen position).
const RISE_RATE = 40;

/**
 * spawnPopup — append a new popup entry to the list.
 * @param {Array} list - Current popup list
 * @param {number} x - Spawn position X
 * @param {number} y - Spawn position Y
 * @param {number} value - Score value to display (e.g., 50)
 * @param {number} ttl - Time-to-live in seconds (default 1)
 * @returns {Array} New list with entry appended (original list unchanged)
 */
export function spawnPopup(list, x, y, value, ttl = 1) {
  return [
    ...list,
    { x, y, value, age: 0, ttl },
  ];
}

/**
 * tickPopups — age popups, make them rise, and cull expired ones.
 * Returns a new array; inputs are never mutated.
 * @param {Array} list - Current popup list
 * @param {number} dt - Delta time (seconds)
 * @returns {Array} Updated list (entries aged, culled if age >= ttl)
 */
export function tickPopups(list, dt) {
  return list
    .map(entry => ({
      ...entry,
      age: entry.age + dt,
      y: entry.y - RISE_RATE * dt,
    }))
    .filter(entry => entry.age < entry.ttl);
}
