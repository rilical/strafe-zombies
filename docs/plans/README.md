# Plans

We build **plan by plan**, PR-driven — there is no issue tracker. Each meaningful change
starts from a short, written plan so the intent is on the record *before* the code, and
the history reads clearly afterward.

## Where a plan lives

- **Small change?** The plan is just the **Plan** section of the PR description. No file
  needed.
- **Bigger or multi-step change?** Add a numbered file here:
  `docs/plans/NNNN-short-name.md`, and link it from the PR. Keep it short — a plan is a
  thinking aid, not a contract.

Plans are append-only history: once a plan ships, leave it as a record of what we
intended. If the approach changed mid-flight, note that at the bottom rather than
rewriting it.

## Template

```markdown
# NNNN — <short name>

**Status:** planned | in progress | shipped (PR #NN)

## Goal
One or two sentences: what this delivers and why it matters now.

## Approach
The shape of the change. Which `src/` module gets the pure logic, what `index.html`
wires up, what stays out of scope.

## Test first
The behavior(s) to pin down with `vitest` before writing code — the cases that prove it
works (including the tricky edge cases).

## Done when
A short checklist: tests green, wired into the renderer, docs/comments updated.
```

## Index

- [`0001-sprite-rendering.md`](0001-sprite-rendering.md) — billboard sprites, depth-correct.
