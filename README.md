# STRAFE — a zombies raycaster, built one small PR at a time

A browser **raycaster** (Wolfenstein/Doom-style pseudo-3D) that grows, incrementally,
into a **strafe-survival zombies game**. Zero runtime dependencies, no assets, no
build step — just open it.

This repo is also a **demonstration of how we build**: test-first, in small frequent
pull requests, with documentation written alongside the code. The commit and PR history
is meant to be read.

![status](https://github.com/rilical/strafe-zombies/actions/workflows/ci.yml/badge.svg)

## Play it

No build step required.

```bash
# Option A — open the file directly (most browsers)
open index.html

# Option B — serve it (needed if your browser blocks ES-module loads over file://)
npm run serve        # python3 -m http.server 8731
# then visit http://localhost:8731/index.html
```

**Controls**

| Input | Action |
|---|---|
| `W` `S` | Move forward / back |
| `A` `D` | Strafe left / right — kite the horde (the core mechanic) |
| Mouse | Aim the gun; push the cursor to a screen edge to turn |
| `←` `→` | Turn the view |
| Click / hold | Shoot — autos fire while held, semi-autos once per click |
| `R` | Reload |
| `Q` / mouse-wheel | Swap between your two weapon slots |
| `F` | Buy — wall guns, Perk-a-Colas, the Mystery Box, debris doors |
| `Enter` / click | Restart after a game over |

## Develop it

```bash
npm install          # one-time: installs vitest
npm test             # run the unit tests once
npm run test:watch   # red/green loop while you work
```

## The idea

A raycaster gives you ~90% of the "looks like Doom" wow for a fraction of the
engineering risk of a real Doom port (no WAD parsing, BSP trees, or 3D model
pipeline). That makes it the perfect baseplate: visually striking, yet small enough
that every gameplay addition is a clean, reviewable pull request.

The **core mechanic is strafing**. Zombies are slow but relentless and approach in
numbers; you survive by circle-strafing — moving sideways (`A`/`D` strafe) to keep distance
and line up shots — not by running in straight lines. The whole game is designed
around making that one mechanic feel good.

## How this repo is built (the part worth copying)

Every change follows the same loop. It is documented in
[`docs/working-agreement.md`](docs/working-agreement.md) and enforced for AI agents in
[`AGENTS.md`](AGENTS.md):

1. **Test-first.** Game logic is pure and lives in `src/` modules. A feature starts as
   a failing `vitest` test, then the code that makes it pass.
2. **Plan by plan, in small PRs.** We are PR-driven — no issue tracker. Each change
   starts from a short written plan (in the PR description, or `docs/plans/` for bigger
   work), then lands as one small, single-concern PR. Large context degrades both humans
   and models — we keep each change small enough to hold in your head (and in a model's
   reliable window).
3. **Docs in between.** Each PR updates the docs it touches and explains *what* and
   *why* in its description. The history is a guided tour, not an archaeology dig.
4. **Seam edits, not rewrites.** We change the minimal region of a file, never
   regenerate whole files. It keeps diffs reviewable and avoids needless churn.

## Layout

| Path | What it is |
|---|---|
| `src/engine.js` | Pure raycasting (DDA) + collision. The testable core. No DOM. |
| `src/*.js` | Pure game systems — `level`, `barriers`, `rounds`, `pathfind`, `shooting`, `survival`, `economy`, `weapons`, `sprites`, … Unit-tested, no DOM. |
| `index.html` | The playable renderer: camera, wall slices, fog, minimap, HUD, input. |
| `test/` | `vitest` unit tests for the pure logic. |
| `docs/` | PRD, architecture, the working agreement, and `plans/` (one file per plan). |
| `.github/` | CI workflow and the pull-request template. |

## Roadmap

The zombies game is built feature by feature, **plan by plan** — each step is a small,
self-contained, heavily-documented pull request. We are **PR-driven**: there is no issue
tracker, and the ordered roadmap lives in [`docs/prd.md`](docs/prd.md). Progress so far:

- [x] Zombie navigation (flow-field, `pathfind.js`, pure + tested — supersedes `stepZombie`)
- [x] Sprite rendering (billboarded zombies) with correct depth vs. walls
- [x] Wave spawner (faithful round escalation, `rounds.js` + window spawns)
- [x] Player health & damage on contact
- [x] Shooting (hitscan) and zombie death
- [x] Score, waves, and a game-over/restart loop
- [x] The Nacht-style 4-room map (`level.js`) with debris doors + boarded windows (`barriers.js`)
- [x] Buying: wall-buy guns, the Mystery Box, and Perk-a-Colas (`economy`/`weapons`/`perks`/`interact`)
- [x] Perk effects — Juggernog (health), Speed Cola (reload), Double Tap (fire rate)
- [x] Power-ups — Nuke / Max Ammo / Insta-Kill / Double Points drops (`powerups.js`)
- [x] Headshots, screen-shake, score popups, blood/spark particles
- [x] Persistent decals — bullet holes on walls + blood pools on the floor (`decals.js`)
- [x] Fully procedural sound — synthesised live in WebAudio, no audio files (`sfx.js`)
- [x] Boarded-window siege — zombies tear the planks off and climb in; press `F` to re-board for points (`barricades.js`)
- [x] Minimap buyables — wall-guns, the box, perks, and doors flagged on the radar (`markers.js`)
- [x] Procedural polish — two-weapon loadout + swap (`loadout.js`), a bigger arsenal with the
  box-only **Ray Gun** and travelling bolts (`weapons.js`/`projectiles.js`), per-gun first-person
  viewmodels (`viewmodels.js`), decal-style procedural zombies (`zombieArt.js`), visible buyable
  machines (`props.js`), per-room textured walls (`walltex.js`), perk badges on the HUD
  (`perks.js`), and zombie snarls/death + Perk-a-Cola jingles (`sfx.js`)

## License

MIT — see [`LICENSE`](LICENSE).
