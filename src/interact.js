export const BOX_COST = 950;
export const INTERACT_RADIUS = 1.6;

const CATEGORY_RANK = Object.freeze({
  mount: 0,
  box: 1,
  perk: 2,
  debris: 3,
});

function cellDistance(player, cx, cy) {
  return Math.hypot(player.x - (cx + 0.5), player.y - (cy + 0.5));
}

function ownsPerk(player, perkId) {
  return player.perks instanceof Set && player.perks.has(perkId);
}

function nearerCandidate(current, candidate) {
  if (candidate.dist > INTERACT_RADIUS) return current;
  if (current === null) return candidate;
  if (candidate.dist < current.dist) return candidate;
  if (candidate.dist > current.dist) return current;

  const categoryDelta = CATEGORY_RANK[candidate.kind] - CATEGORY_RANK[current.kind];
  if (categoryDelta < 0) return candidate;
  if (categoryDelta > 0) return current;

  return String(candidate.id).localeCompare(String(current.id)) < 0 ? candidate : current;
}

function nearestDebrisCell(player, cells) {
  let nearest = null;
  for (const [cx, cy] of cells ?? []) {
    const dist = cellDistance(player, cx, cy);
    if (nearest === null || dist < nearest.dist) {
      nearest = { cx, cy, dist };
    }
  }
  return nearest;
}

/**
 * Finds the nearest still-available buyable within the interaction radius.
 *
 * The function only resolves geometry and availability for the prompt layer:
 * purchases, point spending, weapon grants, and door opening stay in their
 * owning modules. Inputs are treated as immutable and optional level sections
 * are skipped so partially-built level fixtures are safe.
 */
export function findInteractable(level, world, player) {
  let nearest = null;
  const doors = world?.doors ?? {};

  for (const mount of level?.mounts ?? []) {
    nearest = nearerCandidate(nearest, {
      kind: "mount",
      id: mount.id,
      cost: mount.cost,
      weaponId: mount.weaponId,
      cx: mount.cx,
      cy: mount.cy,
      dist: cellDistance(player, mount.cx, mount.cy),
    });
  }

  if (level?.box) {
    nearest = nearerCandidate(nearest, {
      kind: "box",
      id: "box",
      cost: BOX_COST,
      cx: level.box.cx,
      cy: level.box.cy,
      dist: cellDistance(player, level.box.cx, level.box.cy),
    });
  }

  for (const perk of level?.perkMachines ?? []) {
    if (ownsPerk(player, perk.perkId)) continue;
    nearest = nearerCandidate(nearest, {
      kind: "perk",
      id: perk.id,
      cost: perk.cost,
      perkId: perk.perkId,
      cx: perk.cx,
      cy: perk.cy,
      dist: cellDistance(player, perk.cx, perk.cy),
    });
  }

  for (const debris of level?.debris ?? []) {
    if (doors[debris.id] === true) continue;
    const cell = nearestDebrisCell(player, debris.cells);
    if (cell === null) continue;
    nearest = nearerCandidate(nearest, {
      kind: "debris",
      id: debris.id,
      cost: debris.cost,
      opensRoom: debris.opensRoom,
      cx: cell.cx,
      cy: cell.cy,
      dist: cell.dist,
    });
  }

  return nearest;
}
