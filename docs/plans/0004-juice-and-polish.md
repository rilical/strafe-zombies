# 0004 — Game juice + visual polish pass

**Status:** complete · **Branch:** `rilical-zombies-game-design` (trunk; integration agent)

## What / why

The MVP is playable but flat. This pass adds **game feel** and brings the render up to a
basic "good arcade shooter" bar before we scale to batch 2 (level/rounds). Approved design
(Approach A): two tracks run together —

- **Track A — juice modules (pure, TDD'd).** Three tiny `src/` modules built in-session via
  subagent-driven-development, committed straight to trunk (no per-module branches/PRs this
  round). They hold no rendering — just the math/state the integrator draws.
- **Track B — render polish (integration-owned, in `index.html`, no tests).** Lighting,
  procedural walls, humanoid zombies, weapon feel, COD-style HUD, a subtle CRT filter, and
  the wiring that consumes Track A.

## Global constraints (bind every Track A task)

- Vanilla ES modules; **zero runtime deps**; no bundler/build step.
- Pure logic in `src/<module>.js`, unit-tested in `test/<module>.test.js` with vitest.
- **Immutable:** return new objects/arrays; never mutate inputs or their entries.
- **Deterministic** when an `rng` is passed (seeded `rng` ⇒ reproducible output).
- Angles in radians; world units are map cells; `dir = (cos θ, sin θ)`. Match `src/engine.js`.
- **TDD:** a failing `vitest` test lands first, then the minimal code. `npm test` stays green
  (baseline 65). Each task edits **only its two files**; never touches `index.html`.
- Commits include the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`
  trailer.

Contracts below are **frozen** (mirror `docs/agents/{shake,popups,particles}.md` and the hub
`docs/agents/README.md`). Defaults are exact.

## Task 1 — shake (`src/shake.js` + `test/shake.test.js`)

Trauma-based screen shake (Eiserloh/Vlambeer trauma² model). Brief: `docs/agents/shake.md`.

```js
tickShake(trauma, dt, decay = 1.5) -> trauma'        // Math.max(0, trauma - decay*dt)
shakeOffset(trauma, maxPx, rng = Math.random) -> { x, y }
   // amt = trauma*trauma*maxPx;  x = ±amt*(rng()*2-1), y = ±amt*(rng()*2-1)
```

Trauma is clamped to `[0,1]` by callers; this module only decays and converts.

**Tests (failing first):** decay floors at 0 (never negative); offset magnitude scales with
`trauma²` and is bounded by `maxPx`; deterministic offset with a seeded `rng`.

## Task 2 — popups (`src/popups.js` + `test/popups.test.js`)

Floating "+N" score text that rises and fades. Brief: `docs/agents/popups.md`.

```js
spawnPopup(list, x, y, value, ttl = 1) -> list'   // append { x, y, value, age:0, ttl }
tickPopups(list, dt) -> list'                      // age += dt; y -= riseRate*dt; drop age >= ttl
```

**Tests (failing first):** spawn appends one entry (value + `age:0`), input list unchanged;
tick ages, rises (`y` decreases), and culls entries past `ttl`; immutability.

## Task 3 — particles (`src/particles.js` + `test/particles.test.js`)

Short-lived blood puffs (on a hit) and sparks (on a wall ricochet). Brief:
`docs/agents/particles.md`.

```js
spawnBloodPuff(list, x, y, n = 8, rng = Math.random) -> list'  // n particles, random vel + ttl
spawnSpark(list, x, y, n = 6, rng = Math.random) -> list'
tickParticles(list, dt) -> list'   // integrate position by velocity, age, cull dead
```

Entry shape is the implementer's choice (e.g. `{ x, y, vx, vy, age, ttl }`) but plain data.

**Tests (failing first):** spawn adds exactly `n` particles near `(x,y)`, input unchanged;
tick advances position by velocity, ages, removes expired; deterministic with seeded `rng`;
immutability.

## Track B — render polish + wiring (integration agent, `index.html`, not unit-tested)

Pure presentation; contains no game *rules*. Done after Track A passes its final review.

- **Lighting/atmosphere:** radial vignette; gradient ceiling/floor (replace flat gray rects);
  stronger distance fog toward a dark sickly tone; faint flickering global light.
- **Walls:** cheap procedural per-column texturing (mortar/plank lines + vertical noise
  banding + per-cell tint).
- **Zombies:** humanoid silhouette (head + hunched shoulders + dangling arms), desaturated
  rotting palette, white hit-flash on shot, fall/fade death, lurching sway.
- **Weapon:** view-bob while walking, idle sway, recoil kick, brighter scene-lighting muzzle
  flash.
- **Reticle/HUD:** crosshair blooms when firing/moving; COD-style HUD (big ammo bottom-right,
  points pop on change, low-HP red pulse + heartbeat vignette, round-number placeholder).
- **CRT filter:** faint scanlines + vignette, subtle (user-approved ON).
- **Wiring (consumes Track A):** translate the canvas by `shakeOffset` each frame and add
  trauma on shot/hit/contact-damage; draw `popups` ("+N") at the zombie's projected screen
  position on hit/kill; spawn+draw `particles` (blood puff on hit, spark on wall impact).

## Execution

Track A runs under subagent-driven-development: one fresh implementer subagent per task →
task review (spec + quality) → fix loop → ledger, then one Opus whole-branch review across all
three before wiring. Track B is hand-built by the integration agent and validated with
`node --check`/serve + live playtest (server on :8137). Then we move on to batch 2.
