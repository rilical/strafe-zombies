import { describe, it, expect } from "vitest";
import {
  activate,
  applyMaxAmmo,
  applyNuke,
  maybeDrop,
  tickPowerUps,
} from "../src/powerups.js";
import { WEAPONS } from "../src/weapons.js";

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

function rngSequence(values) {
  let index = 0;
  return () => values[index++];
}

function seededRng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

describe("maybeDrop — deterministic floor drops", () => {
  it("returns null when the roll misses the locked 3% drop chance", () => {
    const zombie = deepFreeze({ id: "z1", x: 4.25, y: 6.5, hp: 0 });

    expect(maybeDrop(zombie, rngSequence([0.03]))).toBeNull();
    expect(zombie).toEqual({ id: "z1", x: 4.25, y: 6.5, hp: 0 });
  });

  it("creates a 15s drop at the zombie position when the roll is below 3%", () => {
    const zombie = deepFreeze({ id: "z7", x: 2.5, y: 8.75, hp: 0 });

    expect(maybeDrop(zombie, seededRng(1976))).toEqual({
      id: "powerup-z7",
      type: "instaKill",
      x: 2.5,
      y: 8.75,
      ttl: 15,
    });
  });

  it("selects only the four classic power-up types", () => {
    const zombie = deepFreeze({ id: "z9", x: 1, y: 2 });

    expect(maybeDrop(zombie, rngSequence([0, 0]))?.type).toBe("nuke");
    expect(maybeDrop(zombie, rngSequence([0, 0.25]))?.type).toBe("maxAmmo");
    expect(maybeDrop(zombie, rngSequence([0, 0.5]))?.type).toBe("instaKill");
    expect(maybeDrop(zombie, rngSequence([0, 0.999]))?.type).toBe("doublePoints");
  });
});

describe("tickPowerUps — floor ttl and active timers", () => {
  it("decays drop ttls, culls expired drops, and counts active timers down to zero", () => {
    const state = deepFreeze({
      round: { round: 4 },
      powerUps: [
        { id: "keep", type: "nuke", x: 1, y: 2, ttl: 3 },
        { id: "expire", type: "maxAmmo", x: 3, y: 4, ttl: 1 },
      ],
      activePowerUps: { instaKill: 2, doublePoints: 0.5 },
    });

    const next = tickPowerUps(state, 1.25);

    expect(next).toEqual({
      round: { round: 4 },
      powerUps: [{ id: "keep", type: "nuke", x: 1, y: 2, ttl: 1.75 }],
      activePowerUps: { instaKill: 0.75, doublePoints: 0 },
    });
    expect(next).not.toBe(state);
    expect(next.powerUps).not.toBe(state.powerUps);
    expect(next.activePowerUps).not.toBe(state.activePowerUps);
    expect(state.powerUps[0].ttl).toBe(3);
  });
});

describe("effect helpers", () => {
  it("applyNuke clears all alive zombies and awards the flat 400 point bonus", () => {
    const zombies = deepFreeze([
      { id: "alive-1", hp: 50, x: 1, y: 1 },
      { id: "dead", hp: 0, x: 2, y: 2 },
      { id: "alive-2", hp: 10, x: 3, y: 3 },
    ]);

    const result = applyNuke(zombies);

    expect(result).toEqual({
      zombies: [{ id: "dead", hp: 0, x: 2, y: 2 }],
      points: 400,
    });
    expect(zombies).toHaveLength(3);
  });

  it("applyMaxAmmo refills every owned weapon by data without changing other player fields", () => {
    const player = deepFreeze({
      hp: 100,
      weapon: "carbine",
      ammo: {
        m1911: { mag: 1, reserve: 7 },
        carbine: { mag: 3, reserve: 9 },
        thompson: { mag: 0, reserve: 12 },
      },
      reloadTimer: 1234,
    });

    const next = applyMaxAmmo(player);

    expect(next).toEqual({
      hp: 100,
      weapon: "carbine",
      ammo: {
        m1911: { mag: 8, reserve: 80 },
        carbine: { mag: 15, reserve: 120 },
        thompson: { mag: 30, reserve: 240 },
      },
      reloadTimer: 1234,
    });
    expect(next).not.toBe(player);
    expect(next.ammo).not.toBe(player.ammo);
    expect(player.ammo.carbine).toEqual({ mag: 3, reserve: 9 });
  });

  it("applyMaxAmmo refills box-rolled weapons (trench/B.A.R./ray gun) without throwing", () => {
    // Regression: the Mystery Box can grant trench/bar/raygun, so their ids land in
    // player.ammo. Max Ammo must refill them instead of throwing RangeError mid-game.
    const player = deepFreeze({
      ammo: {
        m1911: { mag: 0, reserve: 0 },
        raygun: { mag: 1, reserve: 2 },
        bar: { mag: 3, reserve: 4 },
        trench: { mag: 0, reserve: 0 },
      },
    });

    const next = applyMaxAmmo(player);

    expect(next.ammo.raygun).toEqual({ mag: WEAPONS.raygun.magSize, reserve: WEAPONS.raygun.reserve });
    expect(next.ammo.bar).toEqual({ mag: WEAPONS.bar.magSize, reserve: WEAPONS.bar.reserve });
    expect(next.ammo.trench).toEqual({ mag: WEAPONS.trench.magSize, reserve: WEAPONS.trench.reserve });
  });

  it("applyMaxAmmo covers every weapon in the WEAPONS table (no id can desync)", () => {
    // Parity guard: build a player owning one of every weapon, then assert Max Ammo
    // refills each to its table capacity. Fails the moment WEAPONS gains an id that the
    // power-up's ammo source of truth doesn't know about.
    const ids = Object.keys(WEAPONS);
    const ammo = Object.fromEntries(ids.map((id) => [id, { mag: 0, reserve: 0 }]));
    const player = deepFreeze({ ammo });

    const next = applyMaxAmmo(player);

    for (const id of ids) {
      expect(next.ammo[id]).toEqual({ mag: WEAPONS[id].magSize, reserve: WEAPONS[id].reserve });
    }
  });

  it("activate sets only insta-kill and double-points timers, defaulting to 30 seconds", () => {
    const active = deepFreeze({ instaKill: 4, doublePoints: 0 });

    expect(activate(active, "instaKill")).toEqual({ instaKill: 30, doublePoints: 0 });
    expect(activate(active, "doublePoints", 12)).toEqual({ instaKill: 4, doublePoints: 12 });
    expect(active).toEqual({ instaKill: 4, doublePoints: 0 });
  });
});
