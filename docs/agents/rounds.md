# Agent: rounds — round math + spawner state machine

**Branch:** `feat/rounds` · **Owns:** `src/rounds.js` + `test/rounds.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The escalation engine: how many zombies, how tough, how fast, how often, and the round
phase machine (intermission → spawning → waiting → next round). Pure and deterministic.

## Contract — you MUST export (exact)
```js
zombiesForRound(r)     -> 2*r + 4
zombieHealthForRound(r)-> r<=9 ? 100*r + 50 : Math.floor(950 * Math.pow(1.1, r-9))
zombieSpeedForRound(r) -> 0.5 (r1-2) | 0.75 (r3-5) | 1.0 (r6-9) | 1.2 (r10+)
spawnDelayForRound(r)  -> Math.max(0.67, 2.5 * Math.pow(0.9, r-1))   // seconds
maxAliveForRound(r)    -> Math.min(24, r + 5)
createSpawnState(round)-> { round, phase:'spawning', toSpawn, alive:0, spawnTimer:0 }
tickSpawner(state, dt) -> { state, shouldSpawn }   // emits one spawn when delay elapses
advanceRound(state)    -> state'                   // phase transitions; intermission = 10s
```
`tickSpawner` only signals `shouldSpawn:true` when the per-round delay elapsed, `toSpawn>0`,
and `alive < maxAliveForRound(round)`; it decrements `toSpawn` and resets its timer.

## Consumes
Nothing — pure math over the round number.

## Consumed by
The integration spawner loop (decides when/where to spawn at a window).

## Research
Double-check the round/HP/speed/cadence formulas against a reputable CoD source (e.g. the
Call of Duty wiki). **Keep the plan's locked numbers** unless they are clearly wrong — if so,
message the integration agent; do not change them silently.

## Test plan (write failing first)
- Each formula at boundary rounds: 1, 2, 3, 5, 6, 9, 10, 11 (count, hp split at r9/r10,
  speed bands, delay floor at 0.67, alive cap at 24).
- `tickSpawner` cadence: no spawn before delay; spawns then resets; respects `maxAlive`.
- `advanceRound` phase order and 10s intermission.

## Definition of done
Contract met · tests cover all formulas + phases + green · `npm test` green · commented ·
self-contained PR · report to integration agent.
