// Pure points wallet for gameplay systems. Callers pass the shared player shape;
// successful operations return copied players so game state owners can swap data safely.

// Award a non-negative payout and return a copied player with updated points.
export function earn(player, n) {
  return { ...player, points: player.points + n };
}

// Attempt a purchase; denied spends preserve the exact original player object.
export function spend(player, cost) {
  const points = player.points - cost;
  if (points < 0) return { ok: false, player };
  return { ok: true, player: { ...player, points } };
}

// Standard hit payout from the locked zombies survival constants.
export function pointsForHit() {
  return 10;
}

// Standard kill payout, with melee using the higher knife award.
export function pointsForKill({ melee = false } = {}) {
  return melee ? 130 : 60;
}
