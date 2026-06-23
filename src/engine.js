// Raycaster engine core — pure, dependency-free, and testable.
//
// This is the "hard judgment" of the project: DDA raycasting + collision.
// It is deliberately free of any rendering or DOM code so the math can be
// unit-tested in Node (via vitest) and reused by the browser renderer.

// 0 = empty, 1/2/3 = wall types (used for color variety). Border is solid.
export const MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 3, 3, 3, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 1],
  [1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 3, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 1, 1, 1, 0, 0, 0, 3, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const MAP_W = MAP[0].length;
export const MAP_H = MAP.length;

// Wall value at integer cell (x, y). Out-of-bounds reads as solid wall.
export function wallAt(map, x, y) {
  if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return 1;
  return map[y][x];
}

// Digital Differential Analysis raycast (Lodev-style).
// Returns the perpendicular wall distance (avoids fisheye), which wall side
// was hit (0 = NS face, 1 = EW face), the wall cell, and its type value.
export function castRay(map, posX, posY, rayDirX, rayDirY) {
  let mapX = Math.floor(posX);
  let mapY = Math.floor(posY);

  const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
  const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

  let stepX, stepY, sideDistX, sideDistY;

  if (rayDirX < 0) {
    stepX = -1;
    sideDistX = (posX - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1.0 - posX) * deltaDistX;
  }
  if (rayDirY < 0) {
    stepY = -1;
    sideDistY = (posY - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1.0 - posY) * deltaDistY;
  }

  let side = 0;
  let wall = 0;
  // Border is always solid, so this terminates; cap iterations as a safety net.
  for (let guard = 0; guard < 256; guard++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    wall = wallAt(map, mapX, mapY);
    if (wall > 0) break;
  }

  const perpWallDist = side === 0
    ? sideDistX - deltaDistX
    : sideDistY - deltaDistY;

  return { perpWallDist, side, mapX, mapY, wall };
}

// True if (x, y) is a walkable (non-wall) point.
export function isWalkable(map, x, y) {
  return wallAt(map, Math.floor(x), Math.floor(y)) === 0;
}

// Per-axis collision so an entity slides along walls instead of sticking.
// Used by both the player and (later) the zombies.
export function moveWithCollision(map, posX, posY, moveX, moveY, radius = 0.18) {
  const tx = posX + moveX;
  if (isWalkable(map, tx + Math.sign(moveX) * radius, posY)) posX = tx;
  const ty = posY + moveY;
  if (isWalkable(map, posX, ty + Math.sign(moveY) * radius)) posY = ty;
  return { x: posX, y: posY };
}
