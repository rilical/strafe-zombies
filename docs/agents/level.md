# Agent: level — the faithful Nacht loop map (data)

**Branch:** `feat/level` · **Owns:** `src/level.js` + `test/level.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
Author the one hand-made map: a faithful Nacht-style **4-room loop around a solid central
core**. You produce the data; `barriers` and `pathfind` code against its shape, so getting the
shape exactly right (per the frozen contract) is the whole job.

## Contract — you MUST export (exact)
Export `LEVEL` conforming **exactly** to the *Level data shape* in
[`README.md`](README.md) (`grid, W, H, spawn, rooms, windows, mounts, box, perkMachines,
debris`). Optional helper: `cellAt(level, cx, cy) -> grid value`.
- Grid border fully solid (match `engine.MAP` convention: 0 empty, 1/2/3 wall types).
- Start small and runnable (≈ 16×16 to start, like `engine.MAP`); a buyable debris door
  (cost 1000) opens the loop. 6 windows · 3 wall-gun mounts · 1 Box · 3 perk machines.

## Consumes
Nothing — you define the data. Stay within the frozen shape.

## Consumed by
`barriers` (`isBlocked`, windows/doors), `pathfind` (walkable grid), integration (render,
spawns, buy spots).

## Research
Reference the real Nacht der Untoten layout (room names, where the box / wall-buys / windows
sit) for flavour — but keep a clean, small grid that fits the engine conventions.

## Test plan (write failing first)
- Grid border is solid; `W`/`H` match the grid dimensions.
- `spawn` cell is walkable (empty).
- Every `window` / `mount` / `box` / `perkMachine` cell is adjacent to a walkable cell.
- Each `debris.cells` cell is currently solid in the base grid (it only opens when bought).
  Debris is drawn as solid rubble (grid value `3`) so the raycaster renders a closed door as a
  wall; `barriers.isBlocked` overrides that for passability (open door → passable regardless of
  the grid value), so debris-as-rubble is intentional and does not break the buyable-door path.

## Definition of done
Shape-correct `LEVEL` · tests green · `npm test` green · commented · self-contained PR ·
report to integration agent.
