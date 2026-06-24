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
      trench: {
        id: "trench",
        name: "Trench Gun",
        damage: 220,
        rpm: 75,
        magSize: 6,
        reserve: 48,
        reloadMs: 2600,
        auto: false,
        price: 1500,
      },
      bar: {
        id: "bar",
        name: "B.A.R.",
        damage: 75,
        rpm: 500,
        magSize: 20,
        reserve: 200,
        reloadMs: 3000,
        auto: true,
        price: 1800,
      },
      raygun: {
        id: "raygun",
        name: "Ray Gun",
        damage: 1000,
        rpm: 120,
        magSize: 20,
        reserve: 160,
        reloadMs: 2500,
        auto: false,
        price: 0,
        boxOnly: true,
        projectile: true,
        splash: 2.0,
        boltSpeed: 12,
        boltRange: 18,
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

  it("honours an rpm override for the cadence gate (Double Tap), defaulting to the table", () => {
    // thompson table rpm 700 -> ~85.7ms cadence; Double Tap (×1.33) -> ~64.5ms cadence.
    const boosted = WEAPONS.thompson.rpm * 1.33;
    const ws = deepFreeze({ id: "thompson", mag: 5, reserve: 10, lastShotMs: 1000 });
    const t = 1000 + 70; // 70ms in: still cooling at table rpm, ready at the boosted rpm

    expect(fire(ws, t).didFire).toBe(false);                  // default = table rpm
    expect(fire(ws, t, { rpm: boosted }).didFire).toBe(true); // override = faster cadence
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

  it("honours a reloadMs override for the timer (Speed Cola), defaulting to the table", () => {
    const ws = deepFreeze({ id: "kar98k", mag: 2, reserve: 10 }); // table reloadMs 2200
    // Speed Cola halves 2200 -> 1100, so the timer lands at now+1100 instead of now+2200.
    expect(startReload(ws, 100, { reloadMs: 1100 }).reloadTimer).toBe(1200);
    expect(startReload(ws, 100).reloadTimer).toBe(2300); // default = table reloadMs
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

  it("throws a RangeError when the requested weapon is boxOnly (e.g. raygun)", () => {
    const player = deepFreeze({ weapon: "m1911", ammo: {} });
    expect(() => buyWallWeapon(player, "raygun")).toThrow(RangeError);
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

  it("never includes m1911 in the box pool; raygun is accessible at the rare end", () => {
    const player = deepFreeze({ weapon: "m1911", ammo: {} });
    // Weighted pool: [kar98k×4, carbine×4, thompson×4, trench×4, bar×4, raygun×1] total=21.
    // rng()=0 → kar98k (first bucket); rng()→1 → raygun (last bucket).
    expect(rollMysteryBox(player, () => 0).weaponId).toBe("kar98k");
    expect(rollMysteryBox(player, () => 0.999999).weaponId).toBe("raygun");

    // Sweep 63 equally-spaced values — m1911 must never appear, raygun must appear.
    const results = Array.from({ length: 63 }, (_, i) =>
      rollMysteryBox(player, () => i / 63).weaponId
    );
    expect(results).not.toContain("m1911");
    expect(results).toContain("raygun");
  });

  it("raygun is rarer than other pool entries (~1/21 weight vs 4/21 each)", () => {
    const player = deepFreeze({ weapon: "m1911", ammo: {} });
    const N = 2100;
    let raygunCount = 0;
    let seed = 1;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let i = 0; i < N; i++) {
      if (rollMysteryBox(player, rng).weaponId === "raygun") raygunCount++;
    }
    // Expected ~100 (1/21 ≈ 4.76%). Allow ±50 for statistical noise.
    expect(raygunCount).toBeGreaterThan(50);
    expect(raygunCount).toBeLessThan(200);
  });
});
