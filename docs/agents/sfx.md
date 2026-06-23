# Agent: sfx — procedural sound recipes (WebAudio voices)

**Branch:** `feat/sfx` · **Owns:** `src/sfx.js` + `test/sfx.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The game's noises — gunshots, reloads, hit/headshot/kill blips, the buy chime and "can't
afford" buzz, the player hurt grunt, zombie groans, the door rumble, round-start sting, and
the power-up jingles — **synthesised live in code, no audio files** (PRD: "SFX are synthesised
live in WebAudio; no music engine, no audio assets").

You own the **pure recipe layer**: a frozen table of sound presets plus pure helpers that
expand a preset into a concrete **Voice** — a plain-data plan of oscillator/noise layers with
frequency and gain breakpoints over time. `index.html` owns the actual WebAudio: it lazily
creates one `AudioContext` on the first user gesture and schedules your Voice onto
`OscillatorNode`/`GainNode`s. **You never touch WebAudio, the DOM, or `index.html`** — your
module must run and be fully unit-tested under plain Node with no browser globals.

## Contract — you MUST export (exact)
```js
// Frozen table of presets, one per game event. Every key below MUST exist.
// Preset shape is yours, but it is plain JSON-able data (no functions, no AudioContext).
export const SFX  // keys (exact): shoot, reload, hit, headshot, kill, buy, deny,
                  //               hurt, groan, door, powerup, roundstart, nuke

// Expand a preset into a concrete, schedulable Voice. Deterministic when `rng` is seeded.
buildVoice(name, rng = Math.random) -> Voice

// Pure ADSR envelope → gain breakpoints, clamped within [0, dur]. Exported for reuse + tests.
adsr({ attack, decay, sustain, release, peak = 1 }, dur) -> Array<[t, level]>
```

### Voice shape (the plan `index.html` schedules) — exact
```js
Voice = {
  dur: number,            // total seconds, > 0
  layers: Layer[],        // >= 1
}
Layer = {
  wave: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise',
  freq: Array<[t, hz]>,   // pitch breakpoints; ignored by the renderer when wave === 'noise'
  gain: Array<[t, level]>,// amplitude breakpoints, level in [0, 1]
}
```
Rules the renderer relies on (assert these in tests):
- `dur > 0`; every layer has `gain.length >= 1`.
- In `freq` and `gain`, times are non-decreasing, start at `0`, and the last time is `<= dur`.
- `gain` levels are within `[0, 1]` and the **final gain breakpoint is `0`** (so a voice always
  releases to silence — no clicks/stuck notes).
- `wave: 'noise'` layers carry a `gain` envelope and may carry a `freq` (band hint) the
  renderer is free to ignore.
- `buildVoice` returns **new** objects each call (no shared mutable state); a seeded `rng`
  makes it deterministic. Unknown `name` → throw `RangeError`.

### Suggested palette (tune freely; keep it faithful + punchy)
- `shoot` — short noise burst + fast square downsweep, ~0.10s.
- `reload` — two soft clicks (short triangle blips), ~0.25s.
- `hit` / `headshot` — tiny blip; `headshot` higher + brighter.
- `kill` — short descending square.
- `buy` — pleasant two-note rising chime; `deny` — low square buzz.
- `hurt` — noisy low grunt; `groan` — low sine/triangle with **rng pitch variation** so the
  horde doesn't sound identical.
- `door` — low noise rumble, ~0.6s.
- `powerup` — bright arpeggio; `nuke` — deep boom (noise + low sine), longest voice.
- `roundstart` — two-note sting.

## Consumes
Nothing. Mirror the plain-data, return-new-array discipline of `particles`/`popups`/`shake`.

## Consumed by
The integration renderer: `index.html` adds `playSfx(name)` that calls `buildVoice` and
schedules the layers (osc/noise + gain) on a shared `AudioContext`, and calls it from the
existing seams (fire, reload, hit/headshot, kill, F-buy success/deny, contact damage, round
start, power-up pickups). Volume/throttling live in `index.html`, not here.

## Research
WebAudio scheduling model only — `setValueAtTime` / `linearRampToValueAtTime` and a
white-noise buffer — so the **Voice breakpoint format maps 1:1 to ramps**. No external audio.

## Test plan (write failing first)
- `SFX` exists, is frozen, and has **every** required key; presets are plain data (no functions).
- `buildVoice(name)` for every key returns a valid Voice: `dur > 0`, `layers.length >= 1`,
  each layer's `freq`/`gain` start at `t = 0`, are time-ordered, end `<= dur`, gain in `[0,1]`,
  and the **last gain breakpoint is 0**.
- `buildVoice` is deterministic under a seeded `rng`; `groan` actually varies across two
  different `rng` draws (pitch differs).
- `adsr(env, dur)` returns ordered `[t, level]` points within `[0, dur]`, peaks at `peak`,
  sustains at `sustain`, and **ends at level 0**; clamps when `attack + decay + release > dur`.
- Unknown name → `RangeError`. Immutability: `buildVoice` shares no mutable state between calls.

## Definition of done
Contract met · tests green · `npm test` green · runs under plain Node (no browser globals) ·
commented · self-contained PR (base `rilical-zombies-game-design`) · report to integration agent.
