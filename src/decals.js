// Persistent decal state and projection math.
//
// Decals are plain data owned by index.html. This module only keeps the list
// capped/aged and turns world-space decal points into screen-space draw inputs.
// It stays dependency-free so the gameplay contracts can be tested in Node.

/**
 * addDecal appends one decal to a new list and evicts the oldest entries beyond cap.
 *
 * @param {Array} list - Existing decals (not mutated)
 * @param {Object} decal - Plain decal data, e.g. { x, y, kind, age, ttl }
 * @param {number} cap - Maximum retained decals
 * @returns {Array} New capped list
 */
export function addDecal(list, decal, cap = 64) {
  const cappedLength = Math.max(0, Math.floor(cap));
  if (cappedLength === 0) return [];
  return [...list, decal].slice(-cappedLength);
}

/**
 * tickDecals ages decals, exposes a renderer-friendly fade, and drops expired entries.
 *
 * ttl defaults to Infinity for permanent marks. Finite entries are culled once
 * their age reaches ttl; Infinity entries keep fade=1 forever.
 *
 * @param {Array} list - Existing decals (not mutated)
 * @param {number} dt - Delta time in seconds
 * @returns {Array} New list with aged, live decals
 */
export function tickDecals(list, dt) {
  return list
    .map((decal) => {
      const age = (decal.age ?? 0) + dt;
      const ttl = decal.ttl ?? Infinity;
      const fade = ttl === Infinity ? 1 : Math.max(0, 1 - age / ttl);
      return { ...decal, age, ttl, fade };
    })
    .filter((decal) => decal.ttl === Infinity || decal.age < decal.ttl);
}

/**
 * projectWallDecal maps a wall mark to screen space using sprites.js camera math.
 *
 * The returned depth is the camera-axis distance, comparable to the raycaster's
 * perpendicular wall distance for depth clipping.
 *
 * @param {Object} player - { x, y, angle } camera state
 * @param {number} FOV - Camera plane half-width factor
 * @param {number} W - Canvas width in pixels
 * @param {number} H - Canvas height in pixels
 * @param {Object} decal - { x, y, ... } world point
 * @returns {{screenX:number,screenY:number,scale:number,depth:number,visible:boolean}}
 */
export function projectWallDecal(player, FOV, W, H, decal) {
  const { transformX, depth } = projectCameraPoint(player, FOV, decal);
  if (depth <= 0) return invisibleProjection(depth);

  return {
    screenX: screenColumn(W, transformX, depth),
    screenY: H / 2,
    scale: H / depth,
    depth,
    visible: true,
  };
}

/**
 * projectFloorDecal maps a ground mark to the floor-cast row for its depth.
 *
 * This inverts the standard rowDistance = (H/2) / (row - H/2) floor-cast formula
 * to locate the row for one known world point.
 *
 * @param {Object} player - { x, y, angle } camera state
 * @param {number} FOV - Camera plane half-width factor
 * @param {number} W - Canvas width in pixels
 * @param {number} H - Canvas height in pixels
 * @param {Object} decal - { x, y, ... } ground point
 * @returns {{screenX:number,screenY:number,scale:number,depth:number,visible:boolean}}
 */
export function projectFloorDecal(player, FOV, W, H, decal) {
  const { transformX, depth } = projectCameraPoint(player, FOV, decal);
  if (depth <= 0) return invisibleProjection(depth);

  return {
    screenX: screenColumn(W, transformX, depth),
    screenY: H / 2 + H / (2 * depth),
    scale: H / depth,
    depth,
    visible: true,
  };
}

function projectCameraPoint(player, FOV, point) {
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  const planeX = -dirY * FOV;
  const planeY = dirX * FOV;
  const relX = point.x - player.x;
  const relY = point.y - player.y;

  // Same inverse [plane | dir] transform as sprites.js, kept local to avoid a
  // cross-module dependency between independently-owned agent contracts.
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const transformX = invDet * (dirY * relX - dirX * relY);
  const depth = invDet * (-planeY * relX + planeX * relY);

  return { transformX, depth };
}

function screenColumn(W, transformX, depth) {
  return (W / 2) * (1 + transformX / depth);
}

function invisibleProjection(depth) {
  return { screenX: NaN, screenY: NaN, scale: 0, depth, visible: false };
}
