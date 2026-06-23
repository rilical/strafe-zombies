# Agent: popups — floating points text

**Branch:** `feat/popups` · **Owns:** `src/popups.js` + `test/popups.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The "+60" numbers that float up and fade when you score. Pure list management; `index.html`
draws them.

## Contract — you MUST export (exact)
```js
spawnPopup(list, x, y, value, ttl = 1) -> list'   // append { x, y, value, age:0, ttl }
tickPopups(list, dt) -> list'                      // age += dt; rise (y -= riseRate*dt);
                                                   // drop entries with age >= ttl
```
Return new arrays; never mutate the input list or its entries.

## Consumes
Nothing.

## Consumed by
The integration renderer (spawns a popup on hit/kill at the zombie's screen position).

## Research
None.

## Test plan (write failing first)
- `spawnPopup` appends one entry with the given value and `age:0`; input list unchanged.
- `tickPopups` increases `age`, decreases `y` (rises), and culls entries past `ttl`.
- Immutability (new array, inputs untouched).

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
