# 0003 — Cursor-aim controls (free-aim + edge-turn)

Status: in progress

## Why

Playtest feedback on the batch-1 MVP: **you cannot shoot at all** and reload feels
dead. Root cause: the canvas used pointer-lock, where the first click calls
`requestPointerLock()` instead of firing. In an embedded/app browser that capture
silently fails, so every click only re-requests the lock and no shot ever fires; the
magazine never empties, so reload looks broken too.

The fix is also the control change the player asked for: **let the visible cursor move
the gun** instead of the original strafe/turn scheme. Removing pointer-lock makes
clicking shoot immediately — the bug disappears as a side effect of the redesign.

## What

Free-aim + edge-turn, no pointer-lock:

- The crosshair tracks the real cursor 1:1. The gun points wherever the crosshair is
  and shots fire **toward the crosshair** (true free-aim across the field of view).
- Pushing the cursor into the left/right edge zone (~12% of width) turns the view that
  way, giving full 360° coverage.
- Click or hold fires toward the crosshair (semi = one shot per click, auto = hold).
  Fires on the *first* click — no lock-grab step.
- Movement: **W/S** forward/back, **A/D** strafe (kiting preserved). **R** reloads.
- Reload is made legible: a `RELOADING…` HUD state, and **auto-reload** when the trigger
  is pulled on an empty magazine, so it never feels unresponsive.

## How

1. **`src/shooting.js` (TDD, backward-compatible).** `resolveShot` always fired along
   `player.angle`. Add an optional final parameter `aimAngle` defaulting to
   `player.angle`, and fire along it. Existing callers are unchanged; the new path lets
   integration fire off-centre toward the crosshair. New failing test first.

2. **`index.html` (glue/render only — no game rules).**
   - Drop `requestPointerLock`; track the cursor (`cx, cy`) from `mousemove` over the
     page, mapped into canvas pixels.
   - Derive the aim direction from the **same** `dir + plane*cameraX` the wall renderer
     uses for column `cx`, so the crosshair visually sits on the column the shot hits.
     Pass `atan2(rayY, rayX)` as `aimAngle` to `resolveShot`.
   - `mousedown` fires immediately (semi) and sets a held flag (auto); edge zones add a
     turn rate to `player.angle`.
   - Render: crosshair at the cursor; gun viewmodel + muzzle flash slide toward the
     cursor; a short-lived hitmarker when a shot connects; `RELOADING…` in the HUD.

## Definition of done

`npm test` green (existing 64 + the new aim test) · only `src/shooting.js`,
`test/shooting.test.js`, `index.html`, and this doc change · index.html stays rule-free
(all rules in tested modules) · page + modules serve 200 · committed with what/why.
