# Working Agreement

How we build in this repo. These rules apply to every contributor — human or AI agent.
They exist because they keep changes reviewable, the history readable, and the project
shippable at every commit.

We are **PR-driven**: there is no issue tracker. Work proceeds **plan by plan** — each
change starts from a short written plan and lands as a small, heavily-documented pull
request. The roadmap lives in [`prd.md`](prd.md); the record of *how* and *why* lives in
the PRs, the docs, and the code comments. The history is meant to be read.

## 1. Test-Driven Development

We write the test first.

- **Red** — write a failing test that describes the behavior you want.
- **Green** — write the simplest code that makes it pass.
- **Refactor** — clean up with the test as your safety net.

Game **logic** must be pure and testable, and therefore lives in `src/` modules with no
DOM or canvas calls. Rendering and input glue live in `index.html` and are intentionally
thin — thin enough that they don't need unit tests. If you find yourself wanting to test
rendering, that's a signal the logic should be extracted into `src/`.

Run `npm run test:watch` while you work. No PR merges with a red suite; CI enforces this.

## 2. Plan by Plan, in Small PRs

We work **one plan at a time**. Before writing code, jot the plan — what we're building,
why, and the test that will prove it — in the PR description (or a short note in
[`plans/`](plans/) for anything larger). Then land it as one small PR.

One concern per PR. Prefer a diff you can review in a couple of minutes.

- A PR adds **one** capability (e.g. "zombie chase AI", "sprite depth sorting"), not
  three.
- If a change is growing past a few hundred lines, stop and split it.
- Merge often. A long-lived branch is a merge conflict waiting to happen and a context
  load nobody needs.

Why this matters beyond tidiness: both reviewers and language models degrade as context
grows. Small PRs keep the whole change inside the window where review is actually
reliable. Frequent integration is cheaper than big-bang merges.

## 3. Documentation Is the Record

We are PR-driven with **no issue tracker**, so the writing *is* the record. Be generous
with it: the goal is that anyone can read the history — PRs, docs, and comments — and
understand the project without spelunking.

- Update the docs your PR affects **in the same PR**.
- The PR description opens with the short plan it followed, then states **what** changed
  and **why**. It is self-contained — no issue numbers to chase.
- Comment the code for a reader: explain intent and the non-obvious *why*, not the
  obvious *what*. Every pure function in `src/` gets a doc comment describing its
  contract (inputs, output, guarantees).
- Keep [`prd.md`](prd.md) (the roadmap) and [`architecture.md`](architecture.md) (the
  shape) honest as the code evolves.

## 4. Seam Edits, Not Rewrites

Change the smallest region that does the job. Do **not** regenerate or rewrite a whole
file to make a small change.

- Edit in place; preserve surrounding code, comments, and formatting.
- A good diff highlights exactly what changed. A whole-file replacement hides the real
  change inside noise, costs more to produce, and is far harder to review.
- This is both a quality rule and an efficiency one: targeted edits are cheaper and
  safer than full-file rewrites.

## 5. Definition of Done

A change is done when:

- [ ] New behavior is covered by a test, and `npm test` is green.
- [ ] The diff is small and focused on one concern.
- [ ] Affected docs are updated in the same PR.
- [ ] The code is commented for a reader (intent and the non-obvious *why*).
- [ ] The PR description opens with its short plan and explains what and why.
- [ ] CI passes.
