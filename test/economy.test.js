import { describe, it, expect } from "vitest";
import { earn, pointsForHit, pointsForKill, spend } from "../src/economy.js";

// economy.js is the pure points wallet: callers pass the shared player shape,
// and every operation returns fresh data unless a purchase is denied.

describe("earn — adding points", () => {
  it("adds points and returns a new player object without mutating the input", () => {
    const player = Object.freeze({ id: "p1", hp: 100, points: 500 });
    const next = earn(player, 60);

    expect(next).not.toBe(player);
    expect(next).toEqual({ id: "p1", hp: 100, points: 560 });
    expect(player.points).toBe(500);
  });
});

describe("spend — purchases", () => {
  it("deducts an affordable cost and returns a new player object", () => {
    const player = Object.freeze({ id: "p1", weapon: "m1911", points: 950 });
    const result = spend(player, 200);

    expect(result.ok).toBe(true);
    expect(result.player).not.toBe(player);
    expect(result.player).toEqual({ id: "p1", weapon: "m1911", points: 750 });
    expect(player.points).toBe(950);
  });

  it("allows an exact-cost purchase without making points negative", () => {
    const player = Object.freeze({ id: "p1", points: 200 });
    const result = spend(player, 200);

    expect(result.ok).toBe(true);
    expect(result.player.points).toBe(0);
  });

  it("denies an unaffordable cost and returns the original player unchanged", () => {
    const player = Object.freeze({ id: "p1", points: 199 });
    const result = spend(player, 200);

    expect(result).toEqual({ ok: false, player });
    expect(result.player).toBe(player);
    expect(result.player.points).toBe(199);
  });
});

describe("payout constants", () => {
  it("pays 10 points for a hit", () => {
    expect(pointsForHit()).toBe(10);
  });

  it("pays 60 points for a normal kill and 130 points for a melee kill", () => {
    expect(pointsForKill()).toBe(60);
    expect(pointsForKill({ melee: true })).toBe(130);
  });
});
