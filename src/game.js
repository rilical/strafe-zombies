// Game logic — pure, dependency-free, unit-tested. No rendering or DOM here.
// Each function takes plain state and returns new state so it can be tested in
// isolation and composed by the renderer in index.html.

import { moveWithCollision } from "./engine.js";

// Advance one zombie toward `target` by `speed * dt` units, sliding along walls
// via the engine's collision. Pure: returns a new entity, never mutates input.
export function stepZombie(map, zombie, target, dt, speed = 1.2) {
  const dx = target.x - zombie.x;
  const dy = target.y - zombie.y;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    return { ...zombie };
  }

  const step = speed * dt;
  const moveX = (dx / dist) * step;
  const moveY = (dy / dist) * step;

  const moved = moveWithCollision(map, zombie.x, zombie.y, moveX, moveY);
  return { ...zombie, x: moved.x, y: moved.y };
}
