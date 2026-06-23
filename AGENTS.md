# AGENTS.md

Instructions for AI agents (Copilot, Claude, Codex, etc.) working in this repo. Humans:
see [`docs/working-agreement.md`](docs/working-agreement.md) — these are the same rules.

## Non-negotiables

1. **Test-Driven Development.** Write a failing `vitest` test first, then the code to make
   it pass, then refactor. Never add logic to `src/` without a test. Run `npm test`
   before claiming anything works.
2. **Small, frequent PRs.** One concern per branch/PR. Keep diffs small. If a change is
   growing past a few hundred lines, split it. Do not bundle unrelated work.
3. **Docs in the same PR.** Update affected docs (`README.md`, `docs/*`) within the PR
   that changes the behavior. Write a PR description with **what** and **why**, linking
   the issue it closes.
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
# 1. add a failing test in test/
# 2. implement the minimal code in src/
npm test                      # must be green
# 3. wire it into index.html if it's player-visible
# 4. update docs touched by the change
git commit -m "feat: <what> (why)"
# open a PR; let CI + review run; merge small
```

## Definition of done

`npm test` green · diff small and single-purpose · docs updated in the same PR · PR
description explains what/why and links its issue · CI passing.

## Style

- Vanilla ES modules. No frameworks, no bundler, no new runtime dependencies without a
  very good reason discussed in the PR.
- Angles in radians; world units are map cells. Match existing conventions in
  `src/engine.js`.
