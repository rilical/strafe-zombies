import { describe, it, expect } from "vitest";
import { MAP } from "../src/engine.js";
import { stepZombie } from "../src/game.js";

// stepZombie(map, zombie, target, dt, speed) advances one zombie toward the
// target (the player) by speed*dt units, sliding along walls via the engine's
// collision. It is a pure function: same inputs -> same output, no mutation.

describe("stepZombie — chasing the player", () => {
  it("moves the zombie toward the player", () => {
    // Open corridor along y = 2.5. Player to the west, zombie to the east.
    const zombie = { x: 5.5, y: 2.5, hp: 3 };
    const next = stepZombie(MAP, zombie, { x: 1.5, y: 2.5 }, 1, 1);
    expect(next.x).toBeCloseTo(4.5, 6); // moved one unit west, toward the player
    expect(next.y).toBeCloseTo(2.5, 6);
  });

  it("moves at speed*dt regardless of how far the player is", () => {
    // Open diagonal; target is far away but the step length is fixed.
    const zombie = { x: 5.5, y: 5.5 };
    const next = stepZombie(MAP, zombie, { x: 12.5, y: 12.5 }, 0.5, 2); // step = 1.0
    const dist = Math.hypot(next.x - 5.5, next.y - 5.5);
    expect(dist).toBeCloseTo(1.0, 6);
  });

  it("does not pass through walls (slides / blocks on the obstructed axis)", () => {
    // A type-3 wall sits at x = 3 on row y = 3. A zombie just west of it that
    // tries to walk east must be blocked on x and stay put.
    const zombie = { x: 2.6, y: 3.5 };
    const next = stepZombie(MAP, zombie, { x: 8.5, y: 3.5 }, 0.5, 1);
    expect(next.x).toBeCloseTo(2.6, 6); // blocked by the wall
    expect(next.y).toBeCloseTo(3.5, 6);
  });

  it("carries the entity's other fields through unchanged and does not mutate input", () => {
    const zombie = { x: 5.5, y: 2.5, hp: 3, id: "z1" };
    const next = stepZombie(MAP, zombie, { x: 1.5, y: 2.5 }, 1, 1);
    expect(next.hp).toBe(3);
    expect(next.id).toBe("z1");
    expect(zombie.x).toBe(5.5); // original untouched
  });

  it("stays put (no NaN) when already on the target", () => {
    const zombie = { x: 4.5, y: 4.5 };
    const next = stepZombie(MAP, zombie, { x: 4.5, y: 4.5 }, 1, 1);
    expect(next.x).toBeCloseTo(4.5, 6);
    expect(next.y).toBeCloseTo(4.5, 6);
  });
});
