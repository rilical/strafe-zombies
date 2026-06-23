// Player survival logic — pure, dependency-free, and unit-tested.
// Integration owns contact detection and per-zombie cooldowns; this module only
// updates the player health fields it is handed.

const REGEN_DELAY_MS = 2000;
const REGEN_TO_FULL_MS = 3000;

/**
 * applyContactDamage(player, dmg, nowMs) -> player'
 *
 * Applies one contact hit to a player, floors hp at 0, stamps the damage time,
 * and preserves every unrelated player field without mutating the input.
 */
export function applyContactDamage(player, dmg, nowMs) {
  const damage = Math.max(0, dmg);
  return {
    ...player,
    hp: Math.max(0, player.hp - damage),
    lastDamageMs: nowMs,
  };
}

/**
 * regen(player, nowMs) -> player'
 *
 * After a short quiet delay, interpolates the player's missing health toward
 * maxHp. Health reaches player.maxHp about 5s after the last hit.
 */
export function regen(player, nowMs) {
  if (player.hp <= 0) return { ...player, hp: 0 };

  const maxHp = player.maxHp;
  const currentHp = Math.min(player.hp, maxHp);
  const msSinceDamage = nowMs - player.lastDamageMs;
  const regenMs = Math.max(0, msSinceDamage - REGEN_DELAY_MS);

  if (regenMs === 0) return { ...player, hp: currentHp };

  const progress = Math.min(regenMs / REGEN_TO_FULL_MS, 1);
  const missingHp = maxHp - currentHp;
  const recoveredHp = currentHp + missingHp * progress;

  return {
    ...player,
    hp: Math.min(maxHp, recoveredHp),
  };
}

/**
 * isGameOver(player) -> boolean
 *
 * A player is down as soon as hp reaches zero or below; there is no downed
 * state or revive path in the v1 survival contract.
 */
export function isGameOver(player) {
  return player.hp <= 0;
}
