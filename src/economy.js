// Pure points wallet for gameplay systems. Callers pass the shared player shape;
// successful operations return copied players so game state owners can swap data safely.

export function earn(player, n) {
  return { ...player, points: player.points + n };
}

export function spend(player, cost) {
  const points = player.points - cost;
  if (points < 0) return { ok: false, player };
  return { ok: true, player: { ...player, points } };
}

export function pointsForHit() {
  return 10;
}

export function pointsForKill({ melee = false } = {}) {
  return melee ? 130 : 60;
}
