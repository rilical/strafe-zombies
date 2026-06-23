# AGENTS.md

Instructions for AI agents (Copilot, Claude, Codex, etc.) working in this repo. Humans:
see [`docs/working-agreement.md`](docs/working-agreement.md) — these are the same rules.

## Non-negotiables

1. **Test-Driven Development.** Write a failing `vitest` test first, then the code to make
   it pass, then refactor. Never add logic to `src/` without a test. Run `npm test`
   before claiming anything works.
2. **Small, frequent PRs.** One concern per branch/PR. Keep diffs small. If a change is
   growing past a few hundred lines, split it. Do not bundle unrelated work.
3. **PR-driven, plan by plan, doc-heavy.** There is no issue tracker. Start each change
   from a short written plan (in the PR description, or a note in `docs/plans/` for larger
   work), then land one small PR. Update affected docs (`README.md`, `docs/*`) in the same
   PR, write a self-contained **what**/**why** description, and comment the code for a
   reader. No issue numbers — the PR stands on its own.
4. **Seam edits, not rewrites.** Change the minimal region of a file. NEVER regenerate or
   rewrite an entire file to make a small change — use targeted edits that preserve
   surrounding code and produce a clean, readable diff.

## Where code goes

- **Pure game logic** (movement, AI, damage, hit detection, spawning) → `src/*.js` as
  exported pure functions. These must be unit-tested.
- **Rendering / input / DOM** → `index.html` only. Keep it thin; it wires pure functions
  to the canvas and keyboard. It is not unit-tested, so it must contain no game *rules*.
- **Tests** → `test/*.test.js`, one spec per `src/` module.

## Workflow for a change

```
git checkout -b feat/<short-name>
# 0. write the short plan (in the PR description, or docs/plans/ for bigger work)
# 1. add a failing test in test/
# 2. implement the minimal code in src/
npm test                      # must be green
# 3. wire it into index.html if it's player-visible
# 4. update docs touched by the change + comment the code for a reader
git commit -m "feat: <what> (why)"
# open a self-contained PR (plan + what/why in the description); CI runs; merge small
```

## Definition of done

`npm test` green · diff small and single-purpose · docs updated in the same PR · code
commented for a reader · PR opens with its plan and explains what/why (self-contained, no
issue refs) · CI passing.

## Style

- Vanilla ES modules. No frameworks, no bundler, no new runtime dependencies without a
  very good reason discussed in the PR.
- Angles in radians; world units are map cells. Match existing conventions in
  `src/engine.js`.
