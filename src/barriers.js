const MAX_BOARDS = 6;

/**
 * Builds the mutable world overlay from static level data.
 */
export function createWorld(level) {
  const doors = {};
  for (const debris of level.debris) {
    doors[debris.id] = false;
  }

  const windows = {};
  for (const windowDef of level.windows) {
    windows[windowDef.id] = MAX_BOARDS;
  }

  return { doors, windows };
}

/**
 * Opens a debris door by id and returns a new world object.
 */
export function openDoor(world, id) {
  return {
    ...world,
    doors: {
      ...world.doors,
      [id]: true,
    },
  };
}

/**
 * Adds one board to the window, clamped to MAX_BOARDS.
 */
export function repairBoard(world, winId) {
  const boards = world.windows[winId] ?? 0;
  return {
    ...world,
    windows: {
      ...world.windows,
      [winId]: Math.min(MAX_BOARDS, boards + 1),
    },
  };
}

/**
 * Removes one board from the window, clamped to zero.
 */
export function tearBoard(world, winId) {
  const boards = world.windows[winId] ?? 0;
  return {
    ...world,
    windows: {
      ...world.windows,
      [winId]: Math.max(0, boards - 1),
    },
  };
}

/**
 * Reports whether a cell is blocked by map bounds, a closed debris door, or a wall.
 *
 * A debris-door cell is governed entirely by the door: closed → blocked, bought
 * (open) → passable, even though the level draws it as solid rubble (a non-zero
 * grid value) until then. That override is what makes buying a door open the
 * path, so it is checked before the static grid-wall test.
 */
export function isBlocked(level, world, cx, cy) {
  if (cy < 0 || cx < 0 || cy >= level.H || cx >= level.W) {
    return true;
  }

  for (const debris of level.debris) {
    for (const [cellX, cellY] of debris.cells) {
      if (cellX === cx && cellY === cy) {
        return world.doors[debris.id] !== true;
      }
    }
  }

  if (level.grid[cy][cx] !== 0) {
    return true;
  }

  return false;
}
