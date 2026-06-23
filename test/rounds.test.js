import { describe, it, expect } from "vitest";
import {
  zombiesForRound,
  zombieHealthForRound,
  zombieSpeedForRound,
  spawnDelayForRound,
  maxAliveForRound,
  createSpawnState,
  tickSpawner,
  advanceRound,
} from "../src/rounds.js";

describe("round formulas", () => {
  it("matches zombies-per-round boundaries", () => {
    expect(zombiesForRound(1)).toBe(6);
    expect(zombiesForRound(2)).toBe(8);
    expect(zombiesForRound(3)).toBe(10);
    expect(zombiesForRound(5)).toBe(14);
    expect(zombiesForRound(6)).toBe(16);
    expect(zombiesForRound(9)).toBe(22);
    expect(zombiesForRound(10)).toBe(24);
    expect(zombiesForRound(11)).toBe(26);
  });

  it("uses linear HP through round 9, then exponential from round 10", () => {
    expect(zombieHealthForRound(1)).toBe(150);
    expect(zombieHealthForRound(2)).toBe(250);
    expect(zombieHealthForRound(3)).toBe(350);
    expect(zombieHealthForRound(5)).toBe(550);
    expect(zombieHealthForRound(6)).toBe(650);
    expect(zombieHealthForRound(9)).toBe(950);
    expect(zombieHealthForRound(10)).toBe(1045);
    expect(zombieHealthForRound(11)).toBe(1149);
  });

  it("uses the locked speed bands across boundary rounds", () => {
    expect(zombieSpeedForRound(1)).toBe(0.5);
    expect(zombieSpeedForRound(2)).toBe(0.5);
    expect(zombieSpeedForRound(3)).toBe(0.75);
    expect(zombieSpeedForRound(5)).toBe(0.75);
    expect(zombieSpeedForRound(6)).toBe(1.0);
    expect(zombieSpeedForRound(9)).toBe(1.0);
    expect(zombieSpeedForRound(10)).toBe(1.2);
    expect(zombieSpeedForRound(11)).toBe(1.2);
  });

  it("uses decreasing spawn delay with a hard floor at 0.67s", () => {
    expect(spawnDelayForRound(1)).toBeCloseTo(2.5, 6);
    expect(spawnDelayForRound(2)).toBeCloseTo(2.25, 6);
    expect(spawnDelayForRound(3)).toBeCloseTo(2.025, 6);
    expect(spawnDelayForRound(5)).toBeCloseTo(1.64025, 6);
    expect(spawnDelayForRound(6)).toBeCloseTo(1.476225, 6);
    expect(spawnDelayForRound(9)).toBeCloseTo(1.076168, 6);
    expect(spawnDelayForRound(10)).toBeCloseTo(0.968551, 6);
    expect(spawnDelayForRound(11)).toBeCloseTo(0.871696, 6);
    expect(spawnDelayForRound(15)).toBe(0.67);
  });

  it("caps max-alive zombies at 24", () => {
    expect(maxAliveForRound(1)).toBe(6);
    expect(maxAliveForRound(2)).toBe(7);
    expect(maxAliveForRound(3)).toBe(8);
    expect(maxAliveForRound(5)).toBe(10);
    expect(maxAliveForRound(6)).toBe(11);
    expect(maxAliveForRound(9)).toBe(14);
    expect(maxAliveForRound(10)).toBe(15);
    expect(maxAliveForRound(11)).toBe(16);
    expect(maxAliveForRound(19)).toBe(24);
    expect(maxAliveForRound(25)).toBe(24);
  });
});

describe("spawner cadence", () => {
  it("does not spawn before delay elapses", () => {
    const initial = createSpawnState(1);
    const result = tickSpawner(initial, 2.49);

    expect(result.shouldSpawn).toBe(false);
    expect(result.state.toSpawn).toBe(initial.toSpawn);
    expect(result.state.spawnTimer).toBeCloseTo(2.49, 6);
    expect(initial.spawnTimer).toBe(0);
  });

  it("emits one spawn at cadence and resets the timer", () => {
    const primed = { ...createSpawnState(1), spawnTimer: 2.49 };
    const result = tickSpawner(primed, 0.02);

    expect(result.shouldSpawn).toBe(true);
    expect(result.state.toSpawn).toBe(primed.toSpawn - 1);
    expect(result.state.spawnTimer).toBe(0);
    expect(primed.toSpawn).toBe(zombiesForRound(1));
  });

  it("does not spawn when alive is already at the per-round cap", () => {
    const round = 10;
    const delay = spawnDelayForRound(round);
    const blocked = {
      ...createSpawnState(round),
      toSpawn: 5,
      alive: maxAliveForRound(round),
      spawnTimer: delay,
    };

    const result = tickSpawner(blocked, 0.1);

    expect(result.shouldSpawn).toBe(false);
    expect(result.state.toSpawn).toBe(5);
    expect(result.state.spawnTimer).toBeCloseTo(delay + 0.1, 6);
  });

  it("does not spawn when no zombies remain to spawn", () => {
    const round = 6;
    const delay = spawnDelayForRound(round);
    const exhausted = { ...createSpawnState(round), toSpawn: 0, spawnTimer: delay };

    const result = tickSpawner(exhausted, 0.1);

    expect(result.shouldSpawn).toBe(false);
    expect(result.state.toSpawn).toBe(0);
    expect(result.state.spawnTimer).toBeCloseTo(delay + 0.1, 6);
  });
});

describe("phase machine", () => {
  it("advances spawning -> waiting -> intermission(10s) -> spawning(next round)", () => {
    const spawning = createSpawnState(1);
    const waiting = advanceRound({ ...spawning, toSpawn: 0 });
    expect(waiting.phase).toBe("waiting");
    expect(waiting.round).toBe(1);

    const intermission = advanceRound({ ...waiting, alive: 0 });
    expect(intermission.phase).toBe("intermission");
    expect(intermission.round).toBe(2);
    expect(intermission.roundTimer).toBe(10);
    expect(intermission.toSpawn).toBe(0);
    expect(intermission.spawnTimer).toBe(0);

    const nextRound = advanceRound(intermission);
    expect(nextRound).toEqual(createSpawnState(2));
  });
});
