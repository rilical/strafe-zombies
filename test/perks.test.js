import { describe, it, expect } from "vitest";
import {
  PERKS,
  effectiveMaxHp,
  effectiveReloadMs,
  effectiveRpm,
  grantPerk,
  hasPerk,
  perkBadges,
} from "../src/perks.js";

describe("PERKS — locked stat Perk-a-Cola data", () => {
  it("exports the frozen perk ids, names, and costs exactly", () => {
    expect(PERKS).toEqual({
      jugg: { id: "jugg", name: "Juggernog", cost: 2500, color: "#c0392b", badge: "JUG", label: "Juggernog" },
      speedCola: { id: "speedCola", name: "Speed Cola", cost: 3000, color: "#2ecc71", badge: "SPD", label: "Speed Cola" },
      doubleTap: { id: "doubleTap", name: "Double Tap", cost: 2000, color: "#e1b12c", badge: "2X", label: "Double Tap" },
    });
  });

  it("each PERKS entry carries the exact frozen display color, badge, and label", () => {
    expect(PERKS.jugg.color).toBe("#c0392b");
    expect(PERKS.jugg.badge).toBe("JUG");
    expect(PERKS.jugg.label).toBe("Juggernog");

    expect(PERKS.speedCola.color).toBe("#2ecc71");
    expect(PERKS.speedCola.badge).toBe("SPD");
    expect(PERKS.speedCola.label).toBe("Speed Cola");

    expect(PERKS.doubleTap.color).toBe("#e1b12c");
    expect(PERKS.doubleTap.badge).toBe("2X");
    expect(PERKS.doubleTap.label).toBe("Double Tap");
  });

  it("each PERKS entry is frozen (display fields cannot be mutated)", () => {
    expect(Object.isFrozen(PERKS.jugg)).toBe(true);
    expect(Object.isFrozen(PERKS.speedCola)).toBe(true);
    expect(Object.isFrozen(PERKS.doubleTap)).toBe(true);
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

describe("perkBadges — ordered HUD badge list", () => {
  it("returns an empty array when player.perks is undefined", () => {
    expect(perkBadges({ perks: undefined })).toEqual([]);
    expect(perkBadges({})).toEqual([]);
  });

  it("returns an empty array when player.perks is an empty Set", () => {
    expect(perkBadges({ perks: new Set() })).toEqual([]);
  });

  it("returns an empty array when player.perks is an empty Array", () => {
    expect(perkBadges({ perks: [] })).toEqual([]);
  });

  it("returns only the owned perk in the fixed order when one perk is owned", () => {
    const result = perkBadges({ perks: new Set(["speedCola"]) });
    expect(result).toEqual([
      { id: "speedCola", color: "#2ecc71", badge: "SPD", label: "Speed Cola" },
    ]);
  });

  it("returns all three perks in the canonical order [jugg, speedCola, doubleTap]", () => {
    const result = perkBadges({ perks: new Set(["doubleTap", "jugg", "speedCola"]) });
    expect(result).toEqual([
      { id: "jugg", color: "#c0392b", badge: "JUG", label: "Juggernog" },
      { id: "speedCola", color: "#2ecc71", badge: "SPD", label: "Speed Cola" },
      { id: "doubleTap", color: "#e1b12c", badge: "2X", label: "Double Tap" },
    ]);
  });

  it("works when player.perks is an Array", () => {
    const result = perkBadges({ perks: ["doubleTap"] });
    expect(result).toEqual([
      { id: "doubleTap", color: "#e1b12c", badge: "2X", label: "Double Tap" },
    ]);
  });

  it("respects fixed canonical order regardless of insertion order in Set", () => {
    const setA = perkBadges({ perks: new Set(["jugg", "doubleTap"]) });
    const setB = perkBadges({ perks: new Set(["doubleTap", "jugg"]) });
    expect(setA).toEqual(setB);
    expect(setA[0].id).toBe("jugg");
    expect(setA[1].id).toBe("doubleTap");
  });

  it("an unowned perk never appears in the result", () => {
    const result = perkBadges({ perks: new Set(["jugg"]) });
    const ids = result.map((e) => e.id);
    expect(ids).not.toContain("speedCola");
    expect(ids).not.toContain("doubleTap");
  });
});
