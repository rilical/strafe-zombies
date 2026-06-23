# Copilot instructions for strafe-zombies

This project is a vanilla-JS raycaster that grows into a zombies game. Follow these
rules on every change (full version in [`AGENTS.md`](../AGENTS.md) and
[`docs/working-agreement.md`](../docs/working-agreement.md)):

- **Test first.** Add a failing `vitest` test in `test/`, then the minimal code in `src/`
  to pass it. Run `npm test`; it must be green. No untested logic in `src/`.
- **PR-driven, plan by plan.** No issue tracker. Start from a short plan (in the PR
  description, or `docs/plans/` for bigger work); land one small, single-purpose PR;
  merge often.
- **Docs in the same PR + comment generously.** Update `README.md` / `docs/*` alongside
  the change, and comment the code's intent so the history reads clearly.
- **Seam edits, not rewrites.** Edit the minimal region of a file. Never regenerate an
  entire file for a small change — produce clean, reviewable diffs.

## Code placement

- Pure logic (movement, AI, damage, shooting, spawning) → `src/*.js`, exported and
  unit-tested.
- Rendering, input, and DOM → `index.html` only, kept thin (no game rules, not tested).

## Conventions

- ES modules, no frameworks/bundler, no new runtime deps without discussion.
- Angles in radians; `dir = (cos θ, sin θ)`; world units are map cells. Match
  `src/engine.js`.
