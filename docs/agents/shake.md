# Agent: shake — trauma-based screen shake

**Branch:** `feat/shake` · **Owns:** `src/shake.js` + `test/shake.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The first slice of game juice: a trauma value that spikes on shots/hits and decays, plus the
per-frame pixel offset it produces. Pure; the canvas translate happens in `index.html`.

## Contract — you MUST export (exact)
```js
tickShake(trauma, dt, decay = 1.5) -> trauma'   // Math.max(0, trauma - decay*dt)
shakeOffset(trauma, maxPx, rng = Math.random) -> { x, y }
   // amt = trauma*trauma*maxPx;  x,y = ±amt*(rng()*2-1)   (trauma² feel)
```
Trauma is clamped to `[0,1]` by callers; you only decay and convert.

## Consumes
Nothing.

## Consumed by
The integration renderer (adds trauma on shots/damage, translates the canvas by the offset).

## Research
The trauma² screen-shake model (Squirrel Eiserloh "Math for Game Programmers: Juicing"; the
Vlambeer "screenshake" talk). Match that quadratic feel.

## Test plan (write failing first)
- `tickShake` decreases trauma by `decay*dt` and floors at 0 (never negative).
- `shakeOffset` magnitude scales with `trauma²` and is bounded by `maxPx`.
- Deterministic offset with a seeded `rng`.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
