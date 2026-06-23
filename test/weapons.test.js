import { describe, it, expect } from "vitest";
import {
  WEAPONS,
  buyWallWeapon,
  fire,
  refillAmmo,
  rollMysteryBox,
  startReload,
  tickReload,
} from "../src/weapons.js";

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

function seededRng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

describe("WEAPONS — locked arsenal data", () => {
  it("exports the plan's weapon stat table exactly", () => {
    expect(WEAPONS).toEqual({
      m1911: {
        id: "m1911",
        name: "M1911",
        damage: 40,
        rpm: 350,
        magSize: 8,
        reserve: 80,
        reloadMs: 1500,
        auto: false,
        price: 0,
      },
      kar98k: {
        id: "kar98k",
        name: "Kar98k",
        damage: 100,
        rpm: 90,
        magSize: 5,
        reserve: 50,
        reloadMs: 2200,
        auto: false,
        price: 200,
      },
      carbine: {
        id: "carbine",
        name: "Carbine",
        damage: 50,
        rpm: 360,
        magSize: 15,
        reserve: 120,
        reloadMs: 1800,
        auto: false,
        price: 600,
      },
      thompson: {
        id: "thompson",
        name: "Thompson",
        damage: 35,
        rpm: 700,
        magSize: 30,
        reserve: 240,
        reloadMs: 2400,
        auto: true,
        price: 1200,
      },
    });
  });
});

describe("fire — cadence and magazine state", () => {
  it("accepts a composed weapon state while canonical player ammo stays id-free", () => {
    const player = deepFreeze({
      weapon: "m1911",
      ammo: { m1911: { mag: 2, reserve: 10 } },
      reloadTimer: undefined,
    });
    const weaponState = { id: player.weapon, ...player.ammo[player.weapon] };

    const result = fire(weaponState, 1000);

    expect(result).toEqual({
      didFire: true,
      state: { id: "m1911", mag: 1, reserve: 10, lastShotMs: 1000 },
    });
    expect(player.ammo.m1911).toEqual({ mag: 2, reserve: 10 });
  });

  it("fires immediately when ready, spending one round and stamping lastShotMs", () => {
    const weaponState = deepFreeze({ id: "m1911", mag: 2, reserve: 10 });
    const result = fire(weaponState, 1000);

    expect(result.didFire).toBe(true);
    expect(result.state).toEqual({ id: "m1911", mag: 1, reserve: 10, lastShotMs: 1000 });
    expect(weaponState).toEqual({ id: "m1911", mag: 2, reserve: 10 });
  });

  it("blocks shots until 60000/rpm milliseconds have elapsed", () => {
    const cadenceMs = 60000 / WEAPONS.thompson.rpm;
    const weaponState = deepFreeze({
      id: "thompson",
      mag: 2,
      reserve: 10,
      lastShotMs: 2000,
    });

    const early = fire(weaponState, 2000 + cadenceMs - 0.01);
    const ready = fire(weaponState, 2000 + cadenceMs);

    expect(early.didFire).toBe(false);
    expect(early.state).toEqual(weaponState);
    expect(ready.didFire).toBe(true);
    expect(ready.state.mag).toBe(1);
    expect(ready.state.lastShotMs).toBeCloseTo(2000 + cadenceMs, 6);
  });

  it("does not fire an empty magazine or while reloading", () => {
    const empty = deepFreeze({ id: "kar98k", mag: 0, reserve: 5, lastShotMs: 0 });
    const reloading = deepFreeze({ id: "carbine", mag: 4, reserve: 60, reloadTimer: 5000 });

    expect(fire(empty, 1000)).toEqual({ state: empty, didFire: false });
    expect(fire(reloading, 1000)).toEqual({ state: reloading, didFire: false });
  });
});

describe("reload — start and completion timing", () => {
  it("starts reloads only when the magazine is not full and reserve ammo exists", () => {
    const partial = deepFreeze({ id: "kar98k", mag: 2, reserve: 10 });
    const full = deepFreeze({ id: "kar98k", mag: 5, reserve: 10 });
    const dry = deepFreeze({ id: "kar98k", mag: 2, reserve: 0 });

    expect(startReload(partial, 100)).toEqual({
      id: "kar98k",
      mag: 2,
      reserve: 10,
      reloadTimer: 2300,
    });
    expect(startReload(full, 100)).toEqual(full);
    expect(startReload(dry, 100)).toEqual(dry);
    expect(partial).toEqual({ id: "kar98k", mag: 2, reserve: 10 });
  });

  it("waits for reloadMs, then transfers reserve into the magazine and clamps to magSize", () => {
    const reloading = deepFreeze({
      id: "carbine",
      mag: 12,
      reserve: 2,
      reloadTimer: 2800,
      lastShotMs: 500,
    });
    const beforeDone = tickReload(reloading, 2799);
    const done = tickReload(reloading, 2800);

    expect(beforeDone).toEqual(reloading);
    expect(done).toEqual({ id: "carbine", mag: 14, reserve: 0, lastShotMs: 500 });
    expect(reloading).toEqual({
      id: "carbine",
      mag: 12,
      reserve: 2,
      reloadTimer: 2800,
      lastShotMs: 500,
    });
  });

  it("uses only the reserve ammo needed to fill the magazine", () => {
    const reloading = deepFreeze({ id: "thompson", mag: 20, reserve: 240, reloadTimer: 1000 });

    expect(tickReload(reloading, 1000)).toEqual({
      id: "thompson",
      mag: 30,
      reserve: 230,
    });
  });
});

describe("refillAmmo — Max Ammo helper", () => {
  it("tops the magazine and reserve without mutating the prior state", () => {
    const weaponState = deepFreeze({ id: "m1911", mag: 1, reserve: 7, lastShotMs: 200 });

    expect(refillAmmo(weaponState)).toEqual({
      id: "m1911",
      mag: 8,
      reserve: 80,
      lastShotMs: 200,
    });
    expect(weaponState).toEqual({ id: "m1911", mag: 1, reserve: 7, lastShotMs: 200 });
  });
});

describe("buyWallWeapon — ownership and full ammo", () => {
  it("equips the wall weapon with full ammo without touching points", () => {
    const player = deepFreeze({
      points: 1250,
      weapon: "m1911",
      ammo: { m1911: { mag: 3, reserve: 12 } },
      hp: 100,
    });

    const bought = buyWallWeapon(player, "thompson");

    expect(bought).toEqual({
      points: 1250,
      weapon: "thompson",
      ammo: {
        m1911: { mag: 3, reserve: 12 },
        thompson: { mag: 30, reserve: 240 },
      },
      hp: 100,
    });
    expect(player).toEqual({
      points: 1250,
      weapon: "m1911",
      ammo: { m1911: { mag: 3, reserve: 12 } },
      hp: 100,
    });
  });
});

describe("rollMysteryBox — seedable random grant", () => {
  it("uses rng deterministically and grants the rolled weapon with full ammo", () => {
    const player = deepFreeze({ points: 950, weapon: "m1911", ammo: {} });
    const first = rollMysteryBox(player, seededRng(12345));
    const second = rollMysteryBox(player, seededRng(12345));

    expect(second.weaponId).toBe(first.weaponId);
    expect(second.player).toEqual(first.player);
    expect(Object.keys(WEAPONS)).toContain(first.weaponId);
    expect(first.player.weapon).toBe(first.weaponId);
    expect(first.player.ammo[first.weaponId]).toEqual({
      mag: WEAPONS[first.weaponId].magSize,
      reserve: WEAPONS[first.weaponId].reserve,
    });
    expect(first.player.points).toBe(950);
  });

  it("maps rng values across the valid weapon ids and clamps the high edge", () => {
    const player = deepFreeze({ weapon: "m1911", ammo: {} });

    expect(rollMysteryBox(player, () => 0).weaponId).toBe("m1911");
    expect(rollMysteryBox(player, () => 0.25).weaponId).toBe("kar98k");
    expect(rollMysteryBox(player, () => 0.5).weaponId).toBe("carbine");
    expect(rollMysteryBox(player, () => 0.999999).weaponId).toBe("thompson");
  });
});
