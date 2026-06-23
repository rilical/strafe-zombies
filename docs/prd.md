# PRD — STRAFE (zombies raycaster)

## Problem / why

We want a small, visually striking artifact that (a) is fun in 30 seconds and (b)
demonstrates a disciplined build process — test-first, small PRs, docs throughout. A
raycaster zombies game hits both: it looks impressive immediately, and it decomposes
into clean, independently shippable features.

## Target user

- **Players:** anyone who can press six keys; the demo should be self-explanatory.
- **Readers:** engineers reviewing the repo to judge *how* we build, not just *what*.

## Core mechanic

**Strafing to survive.** Zombies are slow but numerous and walk straight at the player.
The player wins by circle-strafing (`Q`/`E`) to maintain spacing and line up shots,
rather than running in straight lines. Every feature should make that loop feel better.

## Core features (in deployment order)

This order is the source of truth for sequencing. Each item is one (sometimes two)
small PR(s), each test-first where it touches `src/`.

1. **Baseplate** *(done)* — raycaster engine, renderer, collision, minimap, tests, CI.
2. **Sprite rendering** — billboard a sprite in the world, depth-correct against walls
   (per-column depth buffer). Pure projection math in `src/`, tested.
3. **Zombie entity + chase AI** — `stepZombie()` moves a zombie toward the player using
   existing collision. Pure, tested. Render zombies as sprites.
4. **Wave spawner** — spawn N zombies at map spawn points; pure spawn logic, tested.
5. **Player health & damage** — contact damage with an i-frame cooldown; pure, tested.
   HUD shows health.
6. **Shooting (hitscan)** — fire along the view direction, hit the nearest zombie within
   a cone/range; pure target-selection, tested. Zombie death + removal.
7. **Game loop & score** — waves, score, game-over + restart. HUD shows wave/score.

## Non-goals (explicitly out of scope)

Listing these is how we kill scope creep:

- **No WAD/Doom asset loading, BSP, or real Doom maps.** This is a raycaster, not a Doom
  port.
- **No networking / multiplayer.**
- **No audio engine** beyond, at most, a couple of one-shot SFX much later.
- **No level editor or multiple levels** for the demo — one hand-authored map.
- **No build tooling / framework / bundler.** Vanilla ES modules only.
- **No mobile/touch controls** for the first version.
- **No pathfinding (A*)** — straight-line chase with wall sliding is enough for the
  strafe mechanic; revisit only if it visibly fails.

## Success criteria

- Loads instantly with no build step; runs the whole demo without a refresh.
- The strafe-to-survive loop is legible within ~30 seconds of play.
- Every gameplay feature landed as a small, test-backed, documented PR — the history
  reads as a clean sequence.
- `npm test` green on every commit to `main`; CI enforces it.
