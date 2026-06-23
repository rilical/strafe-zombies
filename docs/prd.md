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

**Survive escalating rounds — Nacht der Untoten style.** You spawn in a sealed building and
**buy wall guns and open debris doors with points**, then **circle-strafe to train the
horde** into a line and shoot. Zombies are slow at first but grow faster, tougher, and more
numerous every round; the loop is *survive a round → earn points → buy an upgrade → survive
the harder round*. Aiming is **mouse-look**, movement is **WASD** (A/D strafe). Every feature
should make that buy-train-shoot loop feel better.

The full v1 design and PR-by-PR build order live in
[`docs/plans/0002-zombies-survival.md`](plans/0002-zombies-survival.md).

## Core features (in deployment order)

This is the high-level arc; the authoritative PR-by-PR sequence (14 steps) lives in
[`0002-zombies-survival.md`](plans/0002-zombies-survival.md). We are PR-driven with no issue
tracker, so that plan *is* the roadmap. Each step is a small, documented PR, test-first where
it touches `src/`.

1. **Baseplate** *(done)* — raycaster engine, renderer, collision, minimap, tests, CI.
2. **Sprite rendering** — depth-correct billboards (per-column depth buffer). Pure, tested.
3. **Zombie nav** — flow-field navigation toward the player (`pathfind.js`), drawn as a
   sprite. Pure, tested. *(Supersedes the original straight-line `stepZombie`.)*
4. **Shooting + game feel** — hitscan target selection, kills, and the juice bundle (screen
   shake, hit marker, muzzle flash, points popups, gunshot SFX). Pure logic tested.
5. **Health & game-over** — contact damage with per-zombie cooldown + regen; down ends the
   run. Damage shows as a screen-edge vignette (no health bar).
6. **Rounds** — faithful round/wave spawner state machine (count/HP/speed/cadence), round HUD.
7. **Points economy** — earn on hit/kill, spend on guns/doors/Box; points HUD.
8. **Map, windows & doors** — the faithful loop level, boarded windows zombies climb through,
   buyable debris that opens the building.
9. **Wall guns + Mystery Box** — wall-buys, ammo/reload, the 950 Box.
10. **Power-ups** — Nuke / Max Ammo / Insta-Kill / Double Points drops.
11. **Textured rendering + decals** — framebuffer, textured walls, floor casting, then
    persistent bullet-hole and blood-pool decals. Capstone renderer work.

## Non-goals (explicitly out of scope)

Listing these is how we kill scope creep:

- **No asset files of any kind.** Textures, sprites, and sounds are all generated
  procedurally in code — no WAD/Doom loading, no BSP, no image/audio files, no real Doom maps.
- **No music engine.** SFX are synthesised live in WebAudio; at most an optional ambient
  drone much later.
- **No A\* pathfinding.** Zombie nav is a cheap **flow-field (Dijkstra)** over the grid —
  enough for a horde converging on one player; revisit only if it visibly fails.
- **No networking / multiplayer.**
- **No level editor or multiple levels** — one hand-authored map (the Nacht loop).
- **No build tooling / framework / bundler.** Vanilla ES modules only.
- **No mobile/touch controls** for the first version.
- **No headshots, perks, Pack-a-Punch, or shotgun penetration** in v1 — see the plan's
  deferred list (headshots need vertical aim; Nacht itself shipped with no perks).

## Success criteria

- Loads instantly with no build step; runs the whole game without a refresh.
- Recognisably *Nacht der Untoten* within ~30 seconds — windows, wall-buys, the round howl,
  the points loop.
- Every gameplay feature landed as a small, test-backed, documented PR — the history
  reads as a clean sequence.
- `npm test` green on every commit to `main`; CI enforces it.
