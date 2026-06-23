import { describe, it, expect } from "vitest";
import { tickShake, shakeOffset } from "../src/shake.js";

describe("tickShake — trauma decay", () => {
  it("decreases trauma by decay*dt", () => {
    const result = tickShake(0.8, 0.1, 1.5);
    expect(result).toBeCloseTo(0.8 - 1.5 * 0.1, 6);
  });

  it("floors at 0 (never negative)", () => {
    const result = tickShake(0.1, 1, 1.5);
    expect(result).toBe(0);
  });

  it("handles trauma=0 staying at 0", () => {
    const result = tickShake(0, 0.5, 1.5);
    expect(result).toBe(0);
  });

  it("handles trauma=1 decaying properly", () => {
    const result = tickShake(1, 0.5, 1.5);
    expect(result).toBeCloseTo(1 - 1.5 * 0.5, 6);
  });

  it("respects custom decay parameter", () => {
    const result = tickShake(0.7, 0.2, 2);
    expect(result).toBeCloseTo(0.7 - 2 * 0.2, 6);
  });
});

describe("shakeOffset — pixel offset with trauma² scaling", () => {
  it("returns object with x and y properties", () => {
    const offset = shakeOffset(0.5, 10);
    expect(offset).toHaveProperty("x");
    expect(offset).toHaveProperty("y");
  });

  it("returns zero offset when trauma is 0", () => {
    const offset = shakeOffset(0, 10);
    expect(offset.x).toEqual(0);
    expect(offset.y).toEqual(0);
  });

  it("scales magnitude with trauma²", () => {
    // With seeded rng returning predictable values
    const rngStub = (() => {
      let calls = 0;
      return () => {
        calls++;
        // First call (x): return 1.0 → (1.0*2-1) = 1
        // Second call (y): return 0.0 → (0.0*2-1) = -1
        return calls === 1 ? 1.0 : 0.0;
      };
    })();

    const trauma = 0.5;
    const maxPx = 10;
    const amt = trauma * trauma * maxPx; // 0.25 * 10 = 2.5
    const offset = shakeOffset(trauma, maxPx, rngStub);

    expect(offset.x).toBeCloseTo(amt * 1, 6); // rng returns 1, so 1*2-1 = 1
    expect(offset.y).toBeCloseTo(amt * -1, 6); // rng returns 0, so 0*2-1 = -1
  });

  it("is bounded by maxPx at trauma=1 with perfect rng", () => {
    // rng always returns 1.0
    const rngStub = () => 1.0;
    const offset = shakeOffset(1, 10, rngStub);

    // amt = 1² * 10 = 10
    // x = 10 * (1.0*2-1) = 10 * 1 = 10
    // y = 10 * (1.0*2-1) = 10 * 1 = 10
    expect(offset.x).toBeCloseTo(10, 6);
    expect(offset.y).toBeCloseTo(10, 6);
  });

  it("produces negative offsets with rng returning 0", () => {
    // rng always returns 0.0
    const rngStub = () => 0.0;
    const offset = shakeOffset(1, 10, rngStub);

    // amt = 1² * 10 = 10
    // x = 10 * (0.0*2-1) = 10 * -1 = -10
    // y = 10 * (0.0*2-1) = 10 * -1 = -10
    expect(offset.x).toBeCloseTo(-10, 6);
    expect(offset.y).toBeCloseTo(-10, 6);
  });

  it("calls rng independently for x and y", () => {
    let callCount = 0;
    const rngStub = () => {
      callCount++;
      return 0.5;
    };

    shakeOffset(0.5, 10, rngStub);
    expect(callCount).toBe(2); // Must call rng twice (once for x, once for y)
  });

  it("uses default Math.random when rng not provided", () => {
    const offset = shakeOffset(0.5, 10);
    // Should not throw and should produce a valid offset object
    expect(offset).toHaveProperty("x");
    expect(offset).toHaveProperty("y");
    expect(typeof offset.x).toBe("number");
    expect(typeof offset.y).toBe("number");
  });
});
