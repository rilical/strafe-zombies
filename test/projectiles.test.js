import { describe, it, expect } from "vitest";
import { spawnBolt, stepBolt, boltHitsWall, boltHitsZombie, splashTargets } from "../src/projectiles.js";

// Ray Gun stats used throughout these tests — matches the WEAPONS table entry exactly.
const RAYGUN = Object.freeze({
  damage: 1000,
  boltSpeed: 12,
  boltRange: 18,
  splash: 2.0,
});

describe("spawnBolt — initial bolt state", () => {
  it("velocity vector points along the given angle", () => {
    const angle = Math.PI / 4; // 45°
    const bolt = spawnBolt(3, 5, angle, RAYGUN);

    expect(bolt.x).toBeCloseTo(3);
    expect(bolt.y).toBeCloseTo(5);
    expect(bolt.vx).toBeCloseTo(Math.cos(angle) * RAYGUN.boltSpeed, 10);
    expect(bolt.vy).toBeCloseTo(Math.sin(angle) * RAYGUN.boltSpeed, 10);
  });

  it("populates damage, splash, speed, range, and resets tracking fields", () => {
    const bolt = spawnBolt(0, 0, 0, RAYGUN);

    expect(bolt.damage).toBe(RAYGUN.damage);
    expect(bolt.splash).toBe(RAYGUN.splash);
    expect(bolt.speed).toBe(RAYGUN.boltSpeed);
    expect(bolt.range).toBe(RAYGUN.boltRange);
    expect(bolt.traveled).toBe(0);
    expect(bolt.dead).toBe(false);
  });

  it("does not mutate the weapon object", () => {
    const weapon = Object.freeze({ ...RAYGUN });
    spawnBolt(1, 2, 0, weapon); // must not throw
    expect(weapon.boltSpeed).toBe(RAYGUN.boltSpeed);
  });
});

describe("stepBolt — movement and lifetime", () => {
  it("advances x, y, and traveled by the expected amount after one tick", () => {
    const bolt = spawnBolt(0, 0, 0, RAYGUN); // angle=0 → vx=12, vy=0
    const dt = 0.1;
    const next = stepBolt(bolt, dt);

    expect(next.x).toBeCloseTo(0 + 12 * dt, 10);
    expect(next.y).toBeCloseTo(0, 10);
    expect(next.traveled).toBeCloseTo(12 * dt, 10);
    expect(next.dead).toBe(false);
  });

  it("marks the bolt dead once traveled reaches the range", () => {
    // Place the bolt one step before expiry.
    const bolt = spawnBolt(0, 0, 0, RAYGUN); // range = 18
    const almostDone = { ...bolt, traveled: 17.9 };
    const done = { ...bolt, traveled: 18 - 12 * 0.1 }; // one dt=0.1 tick away from 18

    expect(stepBolt(almostDone, 0.1).dead).toBe(true); // 17.9 + 1.2 = 19.1 >= 18
    expect(stepBolt({ ...bolt, traveled: 15 }, 0.1).dead).toBe(false); // 15+1.2=16.2 < 18
  });

  it("does not mutate the input bolt", () => {
    const bolt = Object.freeze(spawnBolt(0, 0, 0, RAYGUN));
    stepBolt(bolt, 0.1); // must not throw
    expect(bolt.traveled).toBe(0);
  });
});

describe("boltHitsWall — cell-aligned wall test", () => {
  it("returns true when the bolt's cell is blocked", () => {
    // Bolt at (1.7, 2.3) → cell (1, 2). Mark that cell blocked.
    const bolt = spawnBolt(1.7, 2.3, 0, RAYGUN);
    const isBlocked = (cx, cy) => cx === 1 && cy === 2;

    expect(boltHitsWall(bolt, isBlocked)).toBe(true);
  });

  it("returns false when the bolt's cell is open", () => {
    const bolt = spawnBolt(3.5, 4.5, 0, RAYGUN);
    expect(boltHitsWall(bolt, () => false)).toBe(false);
  });

  it("passes Math.floor of x and y to isBlocked", () => {
    const calls = [];
    const bolt = spawnBolt(2.9, 7.1, 0, RAYGUN);
    boltHitsWall(bolt, (cx, cy) => { calls.push([cx, cy]); return false; });
    expect(calls).toEqual([[2, 7]]);
  });
});

describe("splashTargets — radial damage falloff", () => {
  it("includes zombies within the splash radius and excludes those outside", () => {
    const bolt = { ...spawnBolt(5, 5, 0, RAYGUN), x: 5, y: 5 }; // splash=2.0
    const zombies = [
      { id: "z1", x: 5, y: 5 },     // dist=0  → inside
      { id: "z2", x: 6, y: 5 },     // dist=1  → inside
      { id: "z3", x: 7, y: 5 },     // dist=2  → exactly at edge, inside (<=)
      { id: "z4", x: 7.1, y: 5 },   // dist=2.1 → outside
    ];

    const hits = splashTargets(bolt, zombies);
    const ids = hits.map((h) => h.id);

    expect(ids).toContain("z1");
    expect(ids).toContain("z2");
    expect(ids).toContain("z3");
    expect(ids).not.toContain("z4");
  });

  it("gives full damage at the center and linearly falls off to zero at splash radius", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 0, y: 0 }; // damage=1000, splash=2
    const zombies = [
      { id: "center", x: 0, y: 0 },  // dist=0 → full damage
      { id: "mid",    x: 1, y: 0 },  // dist=1 → 50%
      { id: "edge",   x: 2, y: 0 },  // dist=2 → 0
    ];

    const hits = splashTargets(bolt, zombies);
    const byId = Object.fromEntries(hits.map((h) => [h.id, h]));

    expect(byId.center.damage).toBeCloseTo(1000, 6);
    expect(byId.mid.damage).toBeCloseTo(500, 6);
    expect(byId.edge.damage).toBeCloseTo(0, 6);
  });

  it("returns an empty array when no zombies are in range", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 0, y: 0 };
    expect(splashTargets(bolt, [{ id: "far", x: 10, y: 10 }])).toEqual([]);
    expect(splashTargets(bolt, [])).toEqual([]);
  });

  it("damage is never negative (clamped to zero at the edge)", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 0, y: 0 };
    const zombies = [{ id: "edge", x: 2, y: 0 }];
    const [hit] = splashTargets(bolt, zombies);
    expect(hit.damage).toBeGreaterThanOrEqual(0);
  });

  it("includes the dist field in each result", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 0, y: 0 };
    const [hit] = splashTargets(bolt, [{ id: "z", x: 1, y: 0 }]);
    expect(hit.dist).toBeCloseTo(1, 10);
  });
});

describe("boltHitsZombie — direct-contact detonation", () => {
  it("is true when a zombie is within the contact radius of the bolt", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 5, y: 5 };
    // zombie ~0.3 cells away (inside the default 0.5 contact radius)
    expect(boltHitsZombie(bolt, [{ id: "z", x: 5.2, y: 5.2 }])).toBe(true);
  });

  it("is false when every zombie is beyond the contact radius", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 5, y: 5 };
    // ~2 cells away — inside splash, but NOT a direct contact (bolt should keep flying)
    expect(boltHitsZombie(bolt, [{ id: "z", x: 6.4, y: 6.4 }])).toBe(false);
  });

  it("is false when there are no zombies", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 5, y: 5 };
    expect(boltHitsZombie(bolt, [])).toBe(false);
  });

  it("treats the radius boundary as a hit", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 0, y: 0 };
    expect(boltHitsZombie(bolt, [{ id: "z", x: 0.5, y: 0 }], 0.5)).toBe(true);
  });

  it("honors an explicit (tighter) contact radius", () => {
    const bolt = { ...spawnBolt(0, 0, 0, RAYGUN), x: 0, y: 0 };
    const zombies = [{ id: "z", x: 0.4, y: 0 }];
    expect(boltHitsZombie(bolt, zombies, 0.5)).toBe(true);
    expect(boltHitsZombie(bolt, zombies, 0.3)).toBe(false);
  });
});
