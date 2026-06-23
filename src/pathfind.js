const UNREACHABLE = -1;
const MAX_DISTANCE = 127;
const COLLISION_RADIUS = 0.18;
const CARDINAL_STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

function indexOf(W, col, row) {
  return row * W + col;
}

function inBounds(W, H, col, row) {
  return col >= 0 && row >= 0 && col < W && row < H;
}

function isWalkable(level, world, x, y, isBlocked) {
  return !isBlocked(level, world, Math.floor(x), Math.floor(y));
}

// Per-axis collision in the same style as engine.moveWithCollision so zombies
// keep moving on the free axis when one axis is blocked.
function moveWithInjectedCollision(level, world, x, y, moveX, moveY, isBlocked) {
  const tx = x + moveX;
  if (isWalkable(level, world, tx + Math.sign(moveX) * COLLISION_RADIUS, y, isBlocked)) {
    x = tx;
  }

  const ty = y + moveY;
  if (isWalkable(level, world, x, ty + Math.sign(moveY) * COLLISION_RADIUS, isBlocked)) {
    y = ty;
  }

  return { x, y };
}

// Build a 4-connected BFS field from the player cell over walkable cells.
// Distance 0 is the player cell; blocked/unreachable cells stay at -1.
export function buildFlowField(level, world, col, row, isBlocked) {
  const W = level.W;
  const H = level.H;
  const size = W * H;
  const field = new Int8Array(size);
  field.fill(UNREACHABLE);

  if (!inBounds(W, H, col, row) || isBlocked(level, world, col, row)) {
    return field;
  }

  const queueCol = new Int16Array(size);
  const queueRow = new Int16Array(size);
  let head = 0;
  let tail = 0;

  queueCol[tail] = col;
  queueRow[tail] = row;
  tail += 1;
  field[indexOf(W, col, row)] = 0;

  while (head < tail) {
    const cx = queueCol[head];
    const cy = queueRow[head];
    head += 1;

    const base = field[indexOf(W, cx, cy)];
    if (base >= MAX_DISTANCE) {
      continue;
    }
    const next = base + 1;

    for (const [dx, dy] of CARDINAL_STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(W, H, nx, ny)) continue;
      const ni = indexOf(W, nx, ny);
      if (field[ni] !== UNREACHABLE) continue;
      if (isBlocked(level, world, nx, ny)) continue;

      field[ni] = next > MAX_DISTANCE ? MAX_DISTANCE : next;
      queueCol[tail] = nx;
      queueRow[tail] = ny;
      tail += 1;
    }
  }

  return field;
}

// Return the best 4-neighbour downhill step (toward a smaller distance).
export function flowDir(field, W, col, row) {
  const i = indexOf(W, col, row);
  if (W <= 0 || i < 0 || i >= field.length) {
    return { dx: 0, dy: 0 };
  }

  const here = field[i];
  if (here <= 0) {
    return { dx: 0, dy: 0 };
  }

  let best = here;
  let bestDx = 0;
  let bestDy = 0;
  const H = Math.floor(field.length / W);

  for (const [dx, dy] of CARDINAL_STEPS) {
    const nx = col + dx;
    const ny = row + dy;
    if (!inBounds(W, H, nx, ny)) continue;

    const v = field[indexOf(W, nx, ny)];
    if (v >= 0 && v < best) {
      best = v;
      bestDx = dx;
      bestDy = dy;
    }
  }

  return { dx: bestDx, dy: bestDy };
}

// Move one zombie along the flow field by speed*dt, using per-axis collision.
// Pure: returns a new zombie object and never mutates inputs.
export function stepZombieAlong(level, world, zombie, field, dt, speed, isBlocked) {
  const col = Math.floor(zombie.x);
  const row = Math.floor(zombie.y);
  const dir = flowDir(field, level.W, col, row);

  if ((dir.dx === 0 && dir.dy === 0) || dt === 0 || speed === 0) {
    return { ...zombie };
  }

  // Move toward the centre of the next downhill cell. This keeps motion smooth
  // and still allows wall-slide when one axis gets blocked.
  const targetX = col + 0.5 + dir.dx;
  const targetY = row + 0.5 + dir.dy;
  const toX = targetX - zombie.x;
  const toY = targetY - zombie.y;
  const len = Math.hypot(toX, toY);

  if (len === 0) {
    return { ...zombie };
  }

  const step = speed * dt;
  const moveX = (toX / len) * step;
  const moveY = (toY / len) * step;
  const moved = moveWithInjectedCollision(
    level,
    world,
    zombie.x,
    zombie.y,
    moveX,
    moveY,
    isBlocked
  );

  return { ...zombie, x: moved.x, y: moved.y };
}
