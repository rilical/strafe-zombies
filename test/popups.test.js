import { describe, it, expect } from "vitest";
import { spawnPopup, tickPopups } from "../src/popups.js";

describe("spawnPopup — append popup with age:0", () => {
  it("appends a new entry to the list", () => {
    const list = [];
    const result = spawnPopup(list, 10, 20, 50);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 10, y: 20, value: 50, age: 0, ttl: 1 });
  });

  it("uses provided ttl parameter", () => {
    const list = [];
    const result = spawnPopup(list, 5, 15, 100, 2.5);
    expect(result[0].ttl).toBe(2.5);
  });

  it("defaults ttl to 1 when omitted", () => {
    const list = [];
    const result = spawnPopup(list, 5, 15, 100);
    expect(result[0].ttl).toBe(1);
  });

  it("returns a new list without mutating the input list", () => {
    const list = [{ x: 1, y: 2, value: 10, age: 0.5, ttl: 1 }];
    const originalLength = list.length;
    const result = spawnPopup(list, 10, 20, 50);
    expect(list).toHaveLength(originalLength);
    expect(result).toHaveLength(originalLength + 1);
  });

  it("preserves existing entries immutably", () => {
    const existing = { x: 1, y: 2, value: 10, age: 0.5, ttl: 1 };
    const list = [existing];
    const result = spawnPopup(list, 10, 20, 50);
    expect(result[0]).toEqual(existing);
    expect(result[0]).toBe(existing); // Same reference
  });

  it("appends to non-empty list", () => {
    const list = [
      { x: 1, y: 2, value: 10, age: 0, ttl: 1 },
      { x: 5, y: 6, value: 20, age: 0.2, ttl: 1 },
    ];
    const result = spawnPopup(list, 10, 20, 50);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ x: 10, y: 20, value: 50, age: 0, ttl: 1 });
  });
});

describe("tickPopups — age, rise, and cull", () => {
  it("increases age by dt", () => {
    const list = [{ x: 10, y: 20, value: 50, age: 0.5, ttl: 2 }];
    const result = tickPopups(list, 0.1);
    expect(result[0].age).toBeCloseTo(0.6, 6);
  });

  it("decreases y (rises) after tick", () => {
    const list = [{ x: 10, y: 20, value: 50, age: 0, ttl: 2 }];
    const originalY = list[0].y;
    const result = tickPopups(list, 0.1);
    // Popup should rise (y decreases)
    expect(result[0].y).toBeLessThan(originalY);
  });

  it("culls entries where age >= ttl", () => {
    const list = [
      { x: 10, y: 20, value: 50, age: 0.9, ttl: 1 },
      { x: 15, y: 25, value: 60, age: 1.0, ttl: 1 },
      { x: 20, y: 30, value: 70, age: 1.1, ttl: 1 },
    ];
    const result = tickPopups(list, 0.2);
    // After tick: [age 1.1, age 1.2, age 1.3], ttl=1, so all should be culled
    expect(result).toHaveLength(0);
  });

  it("keeps entries where age < ttl after tick", () => {
    const list = [{ x: 10, y: 20, value: 50, age: 0.8, ttl: 1 }];
    const result = tickPopups(list, 0.1);
    expect(result).toHaveLength(1);
    expect(result[0].age).toBeCloseTo(0.9, 6);
  });

  it("culls entries at the exact boundary (age === ttl)", () => {
    const list = [{ x: 10, y: 20, value: 50, age: 0.9, ttl: 1 }];
    const result = tickPopups(list, 0.1);
    // After tick: age=1.0, ttl=1, so age >= ttl is true → should be culled
    expect(result).toHaveLength(0);
  });

  it("returns a new array without mutating the input", () => {
    const list = [{ x: 10, y: 20, value: 50, age: 0.5, ttl: 2 }];
    const originalAge = list[0].age;
    const originalY = list[0].y;
    tickPopups(list, 0.1);
    expect(list[0].age).toBe(originalAge);
    expect(list[0].y).toBe(originalY);
  });

  it("does not mutate original entry objects in the input list", () => {
    const entry = { x: 10, y: 20, value: 50, age: 0.5, ttl: 2 };
    const list = [entry];
    const result = tickPopups(list, 0.1);
    expect(result[0]).not.toBe(entry); // Must be a new object
    expect(entry.age).toBe(0.5); // Original unchanged
    expect(entry.y).toBe(20); // Original unchanged
  });

  it("handles multiple entries with different ttl values", () => {
    const list = [
      { x: 10, y: 20, value: 50, age: 0.8, ttl: 1 },
      { x: 15, y: 25, value: 60, age: 1.9, ttl: 2 },
    ];
    const result = tickPopups(list, 0.3);
    // After tick: [age 1.1, ttl 1 → cull], [age 2.2, ttl 2 → cull]
    expect(result).toHaveLength(0);
  });

  it("preserves entries that don't reach ttl", () => {
    const list = [
      { x: 10, y: 20, value: 50, age: 0.5, ttl: 2 },
      { x: 15, y: 25, value: 60, age: 0.3, ttl: 1 },
    ];
    const result = tickPopups(list, 0.2);
    // After tick: [age 0.7, ttl 2 → keep], [age 0.5, ttl 1 → keep]
    expect(result).toHaveLength(2);
  });

  it("handles empty list", () => {
    const result = tickPopups([], 0.1);
    expect(result).toHaveLength(0);
  });

  it("applies rise uniformly across multiple entries", () => {
    const list = [
      { x: 10, y: 20, value: 50, age: 0, ttl: 2 },
      { x: 15, y: 30, value: 60, age: 0, ttl: 2 },
    ];
    const y0a = list[0].y;
    const y0b = list[1].y;
    const result = tickPopups(list, 0.1);
    // Both entries should rise by the same amount
    const deltaA = y0a - result[0].y;
    const deltaB = y0b - result[1].y;
    expect(deltaA).toBeCloseTo(deltaB, 6);
    // And both should rise (delta > 0)
    expect(deltaA).toBeGreaterThan(0);
  });
});
