import { describe, it, expect } from "vitest";
import { spawnBloodPuff, spawnSpark, tickParticles } from "../src/particles.js";

// Deterministic rng stub: cycles through a fixed sequence.
// 3 draws per particle in fixed order: angle, speed, ttl.
function makeRng(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe("spawnBloodPuff — append n blood particles at (x,y)", () => {
  it("adds exactly 8 particles by default", () => {
    const result = spawnBloodPuff([], 5, 10);
    expect(result).toHaveLength(8);
  });

  it("adds exactly n particles when n is specified", () => {
    const result = spawnBloodPuff([], 5, 10, 3);
    expect(result).toHaveLength(3);
  });

  it("all particles start at (x,y)", () => {
    const result = spawnBloodPuff([], 3, 7, 4);
    for (const p of result) {
      expect(p.x).toBe(3);
      expect(p.y).toBe(7);
    }
  });

  it("all particles start with age 0", () => {
    const result = spawnBloodPuff([], 0, 0, 4);
    for (const p of result) {
      expect(p.age).toBe(0);
    }
  });

  it("returns a new array; input list is unchanged", () => {
    const list = [{ x: 1, y: 2, vx: 0, vy: 0, age: 0, ttl: 1 }];
    const result = spawnBloodPuff(list, 5, 5, 2);
    expect(list).toHaveLength(1);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(list[0]); // existing entry same reference
  });

  it("produces deterministic vx/vy/ttl with a stub rng", () => {
    // 3 draws per particle in order: angle, speed, ttl
    // seq [0, 0.5, 0.5]:
    //   angle = 0 * 2π = 0
    //   speed = BLOOD_SPEED_MIN + 0.5 * (BLOOD_SPEED_MAX - BLOOD_SPEED_MIN) = 1.0 + 0.5*3.0 = 2.5
    //   ttl   = BLOOD_TTL_MIN   + 0.5 * (BLOOD_TTL_MAX   - BLOOD_TTL_MIN)   = 0.3 + 0.5*0.4 = 0.5
    const rng = makeRng([0, 0.5, 0.5]);
    const result = spawnBloodPuff([], 0, 0, 1, rng);
    const p = result[0];
    expect(p.vx).toBeCloseTo(Math.cos(0 * 2 * Math.PI) * (1.0 + 0.5 * 3.0), 10); // 2.5
    expect(p.vy).toBeCloseTo(Math.sin(0 * 2 * Math.PI) * (1.0 + 0.5 * 3.0), 10); // 0.0
    expect(p.ttl).toBeCloseTo(0.3 + 0.5 * 0.4, 10);                               // 0.5
    expect(p.age).toBe(0);
  });

  it("exact determinism: same rng sequence → same particle data", () => {
    const seq = [0.1, 0.4, 0.7, 0.2, 0.6, 0.3];
    const r1 = spawnBloodPuff([], 2, 4, 2, makeRng(seq));
    const r2 = spawnBloodPuff([], 2, 4, 2, makeRng(seq));
    expect(r1[0].vx).toBeCloseTo(r2[0].vx, 10);
    expect(r1[0].vy).toBeCloseTo(r2[0].vy, 10);
    expect(r1[0].ttl).toBeCloseTo(r2[0].ttl, 10);
    expect(r1[1].vx).toBeCloseTo(r2[1].vx, 10);
  });
});

describe("spawnSpark — append n spark particles at (x,y)", () => {
  it("adds exactly 6 particles by default", () => {
    const result = spawnSpark([], 1, 2);
    expect(result).toHaveLength(6);
  });

  it("adds exactly n particles when n is specified", () => {
    const result = spawnSpark([], 1, 2, 4);
    expect(result).toHaveLength(4);
  });

  it("all particles start at (x,y) with age 0", () => {
    const result = spawnSpark([], 9, 3, 3);
    for (const p of result) {
      expect(p.x).toBe(9);
      expect(p.y).toBe(3);
      expect(p.age).toBe(0);
    }
  });

  it("returns a new array; input list is unchanged", () => {
    const list = [];
    const result = spawnSpark(list, 0, 0, 3);
    expect(list).toHaveLength(0);
    expect(result).toHaveLength(3);
    expect(result).not.toBe(list);
  });

  it("deterministic with stub rng", () => {
    // 3 draws per particle in order: angle, speed, ttl
    // seq [0.3, 0.8, 0.2]:
    //   angle = 0.3 * 2π
    //   speed = SPARK_SPEED_MIN + 0.8 * (SPARK_SPEED_MAX - SPARK_SPEED_MIN) = 4.0 + 0.8*5.0 = 8.0
    //   ttl   = SPARK_TTL_MIN   + 0.2 * (SPARK_TTL_MAX   - SPARK_TTL_MIN)   = 0.1 + 0.2*0.2 = 0.14
    const rng = makeRng([0.3, 0.8, 0.2]);
    const result = spawnSpark([], 0, 0, 1, rng);
    const p = result[0];
    expect(p.vx).toBeCloseTo(Math.cos(0.3 * 2 * Math.PI) * (4.0 + 0.8 * 5.0), 10);
    expect(p.vy).toBeCloseTo(Math.sin(0.3 * 2 * Math.PI) * (4.0 + 0.8 * 5.0), 10);
    expect(p.ttl).toBeCloseTo(0.1 + 0.2 * 0.2, 10);                                 // 0.14
  });
});

describe("tickParticles — integrate position, age, and cull", () => {
  it("advances x and y by velocity * dt", () => {
    const list = [{ x: 1, y: 2, vx: 3, vy: -4, age: 0, ttl: 5 }];
    const result = tickParticles(list, 0.1);
    expect(result[0].x).toBeCloseTo(1 + 3 * 0.1, 10);
    expect(result[0].y).toBeCloseTo(2 + (-4) * 0.1, 10);
  });

  it("advances age by dt", () => {
    const list = [{ x: 0, y: 0, vx: 0, vy: 0, age: 0.3, ttl: 2 }];
    const result = tickParticles(list, 0.2);
    expect(result[0].age).toBeCloseTo(0.5, 10);
  });

  it("culls particles where age >= ttl after tick", () => {
    const list = [
      { x: 0, y: 0, vx: 0, vy: 0, age: 0.9, ttl: 1.0 }, // age after tick = 1.0 → cull
    ];
    const result = tickParticles(list, 0.1);
    expect(result).toHaveLength(0);
  });

  it("keeps particle that has not yet expired", () => {
    const list = [
      { x: 0, y: 0, vx: 0, vy: 0, age: 0.8, ttl: 1.0 }, // age after tick = 0.9 → keep
    ];
    const result = tickParticles(list, 0.1);
    expect(result).toHaveLength(1);
  });

  it("culls at exact boundary (age === ttl)", () => {
    const list = [{ x: 0, y: 0, vx: 0, vy: 0, age: 0.9, ttl: 1.0 }];
    const result = tickParticles(list, 0.1); // age becomes 1.0 === ttl → cull
    expect(result).toHaveLength(0);
  });

  it("mixed: culls expired, keeps live", () => {
    const list = [
      { x: 0, y: 0, vx: 1, vy: 0, age: 0.95, ttl: 1.0 }, // age→1.05 → cull
      { x: 5, y: 5, vx: 0, vy: 2, age: 0.5,  ttl: 2.0 }, // age→0.6  → keep
    ];
    const result = tickParticles(list, 0.1);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBeCloseTo(5, 10);
    expect(result[0].y).toBeCloseTo(5 + 2 * 0.1, 10);
  });

  it("returns a new array; input array is not mutated", () => {
    const list = [{ x: 0, y: 0, vx: 1, vy: 1, age: 0, ttl: 5 }];
    const result = tickParticles(list, 0.1);
    expect(result).not.toBe(list);
    expect(list).toHaveLength(1); // original length unchanged
  });

  it("does not mutate original entry objects", () => {
    const entry = { x: 0, y: 0, vx: 1, vy: 1, age: 0.2, ttl: 5 };
    const list = [entry];
    const result = tickParticles(list, 0.1);
    expect(result[0]).not.toBe(entry); // new object
    expect(entry.age).toBe(0.2);       // original unchanged
    expect(entry.x).toBe(0);
  });

  it("handles empty list", () => {
    expect(tickParticles([], 0.1)).toHaveLength(0);
  });
});
