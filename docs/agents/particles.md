# Agent: particles — transient blood puffs & sparks

**Branch:** `feat/particles` · **Owns:** `src/particles.js` + `test/particles.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
Short-lived particles — blood puffs on a hit, sparks on a wall ricochet — that move, age and
die. Pure simulation; `index.html` draws them. (Persistent decals are a different agent.)

## Contract — you MUST export (exact)
```js
spawnBloodPuff(list, x, y, n = 8, rng = Math.random) -> list'  // n particles, random vel + ttl
spawnSpark(list, x, y, n = 6, rng = Math.random) -> list'
tickParticles(list, dt) -> list'   // integrate position by velocity, age, cull dead
```
Particle entry shape is yours to define (e.g. `{ x, y, vx, vy, age, ttl }`) but keep it
plain data. Return new arrays; deterministic when `rng` is seeded.

## Consumes
Nothing.

## Consumed by
The integration renderer (spawns on hit/impact). `decals` may mirror your spawn pattern.

## Research
None — standard particle integration.

## Test plan (write failing first)
- `spawnBloodPuff(list,x,y,n)` adds exactly `n` particles near `(x,y)`; input unchanged.
- `tickParticles` advances positions by velocity, ages them, and removes expired ones.
- Deterministic with a seeded `rng`; immutability.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
