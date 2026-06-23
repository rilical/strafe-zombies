import { describe, it, expect } from "vitest";
import { applyContactDamage, isGameOver, regen } from "../src/survival.js";

describe("applyContactDamage — zombie contact hits", () => {
  it("reduces hp, stamps lastDamageMs, carries other fields, and does not mutate input", () => {
    const player = { x: 1.5, y: 2.5, hp: 100, maxHp: 100, lastDamageMs: 0, points: 500 };
    const next = applyContactDamage(player, 50, 1200);

    expect(next.hp).toBe(50);
    expect(next.lastDamageMs).toBe(1200);
    expect(next.points).toBe(500);
    expect(player.hp).toBe(100);
    expect(player.lastDamageMs).toBe(0);
  });

  it("floors hp at 0 when damage exceeds current health", () => {
    const player = { hp: 35, maxHp: 100, lastDamageMs: 0 };
    const next = applyContactDamage(player, 50, 2000);

    expect(next.hp).toBe(0);
    expect(next.lastDamageMs).toBe(2000);
  });

  it("makes a 100-hp player game-over after two 50-damage hits", () => {
    const player = { hp: 100, maxHp: 100, lastDamageMs: 0 };
    const afterFirstHit = applyContactDamage(player, 50, 1000);
    const afterSecondHit = applyContactDamage(afterFirstHit, 50, 2200);

    expect(afterFirstHit.hp).toBe(50);
    expect(afterSecondHit.hp).toBe(0);
    expect(isGameOver(afterSecondHit)).toBe(true);
  });
});

describe("regen — delayed health recovery", () => {
  it("does nothing before the quiet delay and does not mutate input", () => {
    const player = { hp: 25, maxHp: 100, lastDamageMs: 1000 };
    const next = regen(player, 2999);

    expect(next.hp).toBe(25);
    expect(next).not.toBe(player);
    expect(player.hp).toBe(25);
  });

  it("moves hp toward maxHp after the delay and reaches full health about 5s later", () => {
    const player = { hp: 25, maxHp: 100, lastDamageMs: 1000 };
    const halfway = regen(player, 4500);
    const full = regen(player, 6000);

    expect(halfway.hp).toBeCloseTo(62.5, 6);
    expect(full.hp).toBe(100);
  });

  it("starts restoring missing health as soon as the quiet delay has elapsed", () => {
    const player = { hp: 50, maxHp: 100, lastDamageMs: 1000 };
    const next = regen(player, 3100);

    expect(next.hp).toBeCloseTo(51.666666, 5);
  });

  it("never exceeds maxHp and respects raised maxHp caps", () => {
    const player = { hp: 240, maxHp: 250, lastDamageMs: 1000 };
    const next = regen(player, 12000);

    expect(next.hp).toBe(250);
  });

  it("does not revive a player who is already down", () => {
    const player = { hp: 0, maxHp: 100, lastDamageMs: 1000 };
    const next = regen(player, 12000);

    expect(next.hp).toBe(0);
    expect(isGameOver(next)).toBe(true);
  });
});

describe("isGameOver — down state", () => {
  it("reports game over at zero or negative hp only", () => {
    expect(isGameOver({ hp: 1 })).toBe(false);
    expect(isGameOver({ hp: 0 })).toBe(true);
    expect(isGameOver({ hp: -1 })).toBe(true);
  });
});
