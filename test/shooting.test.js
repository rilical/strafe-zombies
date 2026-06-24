import { describe, it, expect } from "vitest";
import {
  HEADSHOT_DAMAGE_MULT,
  shootRay,
  resolveShot,
  applyDamage,
  scoreForHit,
} from "../src/shooting.js";

const CORRIDOR_MAP = [
  [1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1],
];

const OCCLUDED_MAP = [
  [1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1],
];

const OPEN_ROOM_MAP = [
  [1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1],
];

describe("shootRay — hitscan target selection", () => {
  it("returns the nearest zombie whose body intersects the ray before a wall", () => {
    const near = { id: "near", x: 2.8, y: 1.5, hp: 40 };
    const far = { id: "far", x: 4.2, y: 1.5, hp: 40 };

    const hit = shootRay(CORRIDOR_MAP, 1.5, 1.5, 1, 0, [far, near]);

    expect(hit.zombie).toBe(near);
    expect(hit.t).toBeCloseTo(0.9, 6);
  });

  it("returns null when a wall occludes the zombie body", () => {
    const zombie = { id: "hidden", x: 3.5, y: 1.5, hp: 40 };

    expect(shootRay(OCCLUDED_MAP, 1.5, 1.5, 1, 0, [zombie])).toBeNull();
  });

  it("returns null when the ray misses every zombie body", () => {
    const zombie = { id: "missed", x: 3.0, y: 2.2, hp: 40 };

    expect(shootRay(OPEN_ROOM_MAP, 1.5, 1.5, 1, 0, [zombie])).toBeNull();
  });

  it("skips defeated zombies (hp <= 0) so the ray reaches a living one behind", () => {
    const dead = { id: "dead", x: 2.8, y: 1.5, hp: 0 };
    const alive = { id: "alive", x: 3.6, y: 1.5, hp: 40 };

    const hit = shootRay(CORRIDOR_MAP, 1.5, 1.5, 1, 0, [dead, alive]);

    expect(hit.zombie).toBe(alive);
  });

  it("returns null when the only zombie in the path is already defeated", () => {
    const dead = { id: "dead", x: 3.0, y: 1.5, hp: 0 };

    expect(shootRay(CORRIDOR_MAP, 1.5, 1.5, 1, 0, [dead])).toBeNull();
  });
});

describe("damage and scoring", () => {
  it("exports the frozen headshot damage multiplier", () => {
    expect(HEADSHOT_DAMAGE_MULT).toBe(2);
  });

  it("applies damage immutably and floors hp at zero", () => {
    const zombie = { id: "z1", x: 2.5, y: 1.5, hp: 25, state: "shamble" };

    const damaged = applyDamage(zombie, 40);

    expect(damaged).toEqual({ id: "z1", x: 2.5, y: 1.5, hp: 0, state: "shamble" });
    expect(damaged).not.toBe(zombie);
    expect(zombie.hp).toBe(25);
  });

  it("scores regular hits and kills with the frozen economy values", () => {
    const zombie = { id: "z1", x: 2.5, y: 1.5, hp: 25 };

    expect(scoreForHit(zombie, false)).toBe(10);
    expect(scoreForHit(zombie, true)).toBe(60);
  });

  it("scores headshot kills at the bonus value without changing non-kill hits", () => {
    const zombie = { id: "z1", x: 2.5, y: 1.5, hp: 25 };

    expect(scoreForHit(zombie, true, true)).toBe(100);
    expect(scoreForHit(zombie, false, true)).toBe(10);
  });
});

describe("resolveShot — immutable shot resolution", () => {
  it("damages the ray-selected zombie and reports kill score plus killedId", () => {
    const player = { x: 1.5, y: 1.5, angle: 0 };
    const near = { id: "near", x: 2.8, y: 1.5, hp: 35 };
    const far = { id: "far", x: 4.2, y: 1.5, hp: 80 };
    const zombies = [far, near];
    const weapon = { damage: 40 };

    const result = resolveShot(CORRIDOR_MAP, player, zombies, weapon);

    expect(result.scoreDelta).toBe(60);
    expect(result.killedId).toBe("near");
    expect(result.headshot).toBe(false);
    expect(result.hitId).toBe("near");
    expect(result.zombies).not.toBe(zombies);
    expect(result.zombies[0]).toBe(far);
    expect(result.zombies[1]).toEqual({ id: "near", x: 2.8, y: 1.5, hp: 0 });
    expect(result.zombies[1]).not.toBe(near);
    expect(near.hp).toBe(35);
  });

  it("returns an immutable no-op result when the shot misses", () => {
    const player = { x: 1.5, y: 1.5, angle: 0 };
    const zombies = [{ id: "missed", x: 3.0, y: 2.2, hp: 40 }];

    const result = resolveShot(OPEN_ROOM_MAP, player, zombies, { damage: 40 });

    expect(result).toEqual({
      zombies,
      scoreDelta: 0,
      killedId: null,
      headshot: false,
      hitId: null,
    });
    expect(result.zombies).not.toBe(zombies);
    expect(result.zombies[0]).toBe(zombies[0]);
  });

  it("doubles damage for a killing headshot and awards headshot kill score", () => {
    const player = { x: 1.5, y: 1.5, angle: 0 };
    const zombie = { id: "headshot-kill", x: 2.8, y: 1.5, hp: 70 };
    const zombies = [zombie];
    const weapon = { damage: 40 };

    const result = resolveShot(CORRIDOR_MAP, player, zombies, weapon, player.angle, {
      headshot: true,
    });

    expect(result.scoreDelta).toBe(100);
    expect(result.killedId).toBe("headshot-kill");
    expect(result.headshot).toBe(true);
    expect(result.hitId).toBe("headshot-kill");
    expect(result.zombies[0]).toEqual({ id: "headshot-kill", x: 2.8, y: 1.5, hp: 0 });
    expect(result.zombies[0]).not.toBe(zombie);
    expect(zombie.hp).toBe(70);
  });

  it("records non-killing headshot metadata while keeping hit score at ten", () => {
    const player = { x: 1.5, y: 1.5, angle: 0 };
    const zombie = { id: "headshot-wound", x: 2.8, y: 1.5, hp: 90 };
    const zombies = [zombie];
    const weapon = { damage: 40 };

    const result = resolveShot(CORRIDOR_MAP, player, zombies, weapon, player.angle, {
      headshot: true,
    });

    expect(result.scoreDelta).toBe(10);
    expect(result.killedId).toBeNull();
    expect(result.headshot).toBe(true);
    expect(result.hitId).toBe("headshot-wound");
    expect(result.zombies[0]).toEqual({ id: "headshot-wound", x: 2.8, y: 1.5, hp: 10 });
    expect(result.zombies[0]).not.toBe(zombie);
    expect(zombie.hp).toBe(90);
  });

  it("fires along an explicit aimAngle when provided, off the player's facing axis", () => {
    // Free-aim: the integration layer points shots at the crosshair, which can sit
    // off the player's facing direction. A zombie the straight-ahead shot misses must
    // be hit when aimAngle is steered onto it.
    const player = { x: 1.5, y: 1.5, angle: 0 };
    const zombie = { id: "offaxis", x: 3.0, y: 2.2, hp: 30 };
    const zombies = [zombie];
    const weapon = { damage: 40 };

    // Default (along player.angle = 0) sails past this zombie.
    expect(resolveShot(OPEN_ROOM_MAP, player, zombies, weapon).killedId).toBeNull();

    // Aiming straight at the zombie connects and kills it.
    const aim = Math.atan2(zombie.y - player.y, zombie.x - player.x);
    const result = resolveShot(OPEN_ROOM_MAP, player, zombies, weapon, aim);

    expect(result.killedId).toBe("offaxis");
    expect(result.scoreDelta).toBe(60);
    expect(result.zombies[0].hp).toBe(0);
  });
});
