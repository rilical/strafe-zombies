import { castRay } from "./engine.js";

const DEFAULT_ZOMBIE_RADIUS = 0.4;
const EPSILON = 1e-9;

// Ray-circle intersection in the same t-units as castRay: if callers pass an
// unnormalized direction, both zombie and wall distances stay comparable.
function intersectRayCircle(px, py, dx, dy, cx, cy, radius) {
  const ox = px - cx;
  const oy = py - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;

  const b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const root = Math.sqrt(discriminant);
  const scale = 1 / (2 * a);
  const t1 = (-b - root) * scale;
  const t2 = (-b + root) * scale;

  if (t1 > EPSILON) return t1;
  if (t2 > EPSILON) return t2;
  return null;
}

/**
 * Returns the nearest zombie body intersected by the ray before any wall, or
 * null when the shot misses or is occluded.
 */
export function shootRay(map, px, py, dx, dy, zombies, opts = {}) {
  const radius = opts.radius ?? DEFAULT_ZOMBIE_RADIUS;
  const wallT = castRay(map, px, py, dx, dy).perpWallDist;
  let nearest = null;

  for (const zombie of zombies) {
    const t = intersectRayCircle(px, py, dx, dy, zombie.x, zombie.y, radius);
    if (t === null || t >= wallT) continue;
    if (nearest === null || t < nearest.t) nearest = { zombie, t };
  }

  return nearest;
}

/**
 * Returns a new zombie with damage applied. HP never drops below zero and all
 * non-HP fields are preserved for the owning systems.
 */
export function applyDamage(zombie, dmg) {
  return { ...zombie, hp: Math.max(0, zombie.hp - dmg) };
}

/**
 * Frozen scoring contract for this module: any hit is 10, a kill is 60.
 */
export function scoreForHit(zombie, killed) {
  return killed ? 60 : 10;
}

/**
 * Fires along the player's facing angle, immutably damages the selected zombie,
 * and reports the score delta plus killed zombie id for integration glue.
 */
export function resolveShot(map, player, zombies, weapon) {
  const dx = Math.cos(player.angle);
  const dy = Math.sin(player.angle);
  const hit = shootRay(map, player.x, player.y, dx, dy, zombies);

  if (hit === null) {
    return { zombies: zombies.slice(), scoreDelta: 0, killedId: null };
  }

  const hitIndex = zombies.indexOf(hit.zombie);
  const damaged = applyDamage(hit.zombie, weapon.damage);
  const killed = hit.zombie.hp > 0 && damaged.hp === 0;
  const nextZombies = zombies.map((zombie, index) => (
    index === hitIndex ? damaged : zombie
  ));

  return {
    zombies: nextZombies,
    scoreDelta: scoreForHit(hit.zombie, killed),
    killedId: killed ? hit.zombie.id ?? null : null,
  };
}
