const INTERMISSION_SECONDS = 10;

function canEmitSpawn(state, spawnTimer) {
  return (
    spawnTimer >= spawnDelayForRound(state.round) &&
    state.toSpawn > 0 &&
    state.alive < maxAliveForRound(state.round)
  );
}

// Locked Nacht pacing: total zombies in round r.
export function zombiesForRound(r) {
  return 2 * r + 4;
}

// Locked Nacht health curve: linear through 9, then 10% growth each round.
export function zombieHealthForRound(r) {
  if (r <= 9) {
    return 100 * r + 50;
  }

  return Math.floor(950 * Math.pow(1.1, r - 9));
}

// Locked speed bands by round range.
export function zombieSpeedForRound(r) {
  if (r <= 2) {
    return 0.5;
  }

  if (r <= 5) {
    return 0.75;
  }

  if (r <= 9) {
    return 1.0;
  }

  return 1.2;
}

// Spawn cadence asymptotically speeds up with a hard floor.
export function spawnDelayForRound(r) {
  return Math.max(0.67, 2.5 * Math.pow(0.9, r - 1));
}

// Alive cap rises each round up to the classic hard cap.
export function maxAliveForRound(r) {
  return Math.min(24, r + 5);
}

export function createSpawnState(round) {
  return {
    round,
    phase: "spawning",
    toSpawn: zombiesForRound(round),
    alive: 0,
    spawnTimer: 0,
  };
}

export function tickSpawner(state, dt) {
  const spawnTimer = state.spawnTimer + dt;
  const canSpawn = canEmitSpawn(state, spawnTimer);

  if (!canSpawn) {
    return {
      state: { ...state, spawnTimer },
      shouldSpawn: false,
    };
  }

  return {
    state: { ...state, toSpawn: state.toSpawn - 1, spawnTimer: 0 },
    shouldSpawn: true,
  };
}

export function advanceRound(state) {
  switch (state.phase) {
    case "spawning":
      return { ...state, phase: "waiting", spawnTimer: 0 };
    case "waiting":
      return {
        round: state.round + 1,
        phase: "intermission",
        toSpawn: 0,
        alive: 0,
        spawnTimer: 0,
        roundTimer: INTERMISSION_SECONDS,
      };
    case "intermission":
      return createSpawnState(state.round);
    default:
      return state;
  }
}
