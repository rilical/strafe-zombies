import { describe, it, expect } from "vitest";
import {
  PERKS,
  effectiveMaxHp,
  effectiveReloadMs,
  effectiveRpm,
  grantPerk,
  hasPerk,
} from "../src/perks.js";

describe("PERKS — locked stat Perk-a-Cola data", () => {
  it("exports the frozen perk ids, names, and costs exactly", () => {
    expect(PERKS).toEqual({
      jugg: { id: "jugg", name: "Juggernog", cost: 2500 },
      speedCola: { id: "speedCola", name: "Speed Cola", cost: 3000 },
      doubleTap: { id: "doubleTap", name: "Double Tap", cost: 2000 },
    });
  });
});

describe("hasPerk — Set-backed ownership checks", () => {
  it("reports whether the player owns a perk id", () => {
    const player = { perks: new Set(["jugg"]) };

    expect(hasPerk(player, "jugg")).toBe(true);
    expect(hasPerk(player, "speedCola")).toBe(false);
  });
});

describe("grantPerk — immutable perk grants", () => {
  it("returns a new player with a cloned perk Set and leaves the input unchanged", () => {
    const player = { points: 2500, perks: new Set(["speedCola"]) };

    const next = grantPerk(player, "jugg");

    expect(next).not.toBe(player);
    expect(next.perks).not.toBe(player.perks);
    expect([...next.perks].sort()).toEqual(["jugg", "speedCola"]);
    expect([...player.perks]).toEqual(["speedCola"]);
    expect(next.points).toBe(2500);
  });

  it("is idempotent while still returning a fresh player and Set", () => {
    const player = { perks: new Set(["doubleTap"]) };

    const next = grantPerk(player, "doubleTap");

    expect(next).not.toBe(player);
    expect(next.perks).not.toBe(player.perks);
    expect([...next.perks]).toEqual(["doubleTap"]);
    expect([...player.perks]).toEqual(["doubleTap"]);
  });
});

describe("effectiveMaxHp — Juggernog max-health multiplier", () => {
  it("keeps base max hp at 100 until Juggernog is owned", () => {
    expect(effectiveMaxHp({ perks: new Set() })).toBe(100);
    expect(effectiveMaxHp({ perks: new Set(["jugg"]) })).toBe(250);
  });
});

describe("effectiveReloadMs — Speed Cola reload multiplier", () => {
  it("halves reload time only when Speed Cola is owned", () => {
    expect(effectiveReloadMs({ perks: new Set() }, 2400)).toBe(2400);
    expect(effectiveReloadMs({ perks: new Set(["speedCola"]) }, 2400)).toBe(1200);
  });
});

describe("effectiveRpm — Double Tap fire-rate multiplier", () => {
  it("multiplies rpm by 1.33 only when Double Tap is owned", () => {
    expect(effectiveRpm({ perks: new Set() }, 700)).toBe(700);
    expect(effectiveRpm({ perks: new Set(["doubleTap"]) }, 700)).toBeCloseTo(931, 6);
  });
});
