# Agent: weapons — weapon data, fire/reload, wall-buy & Mystery Box

**Branch:** `feat/weapons` · **Owns:** `src/weapons.js` + `test/weapons.test.js` ·
**Status:** not started

Read [`docs/agents/README.md`](README.md) first and follow its **Universal workflow**.

## Mission
The data-driven arsenal and per-weapon ammo/reload state, plus buying wall guns and rolling
the Mystery Box. Pure functions over weapon/ammo state — no rendering, no input.

## Contract — you MUST export (exact)
```js
WEAPONS = {  // values from the plan's Faithful constants block
  m1911:   { id:'m1911',   name:'M1911',   damage:40,  rpm:350, magSize:8,  reserve:80,  reloadMs:1500, auto:false, price:0    },
  kar98k:  { id:'kar98k',  name:'Kar98k',  damage:100, rpm:90,  magSize:5,  reserve:50,  reloadMs:2200, auto:false, price:200  },
  carbine: { id:'carbine', name:'Carbine', damage:50,  rpm:360, magSize:15, reserve:120, reloadMs:1800, auto:false, price:600  },
  thompson:{ id:'thompson',name:'Thompson',damage:35,  rpm:700, magSize:30, reserve:240, reloadMs:2400, auto:true,  price:1200 },
}
fire(weaponState, nowMs) -> { state, didFire }   // honours rpm cadence + mag>0; mag--, lastShotMs
startReload(weaponState, nowMs) -> state         // begins reload if mag<magSize and reserve>0
tickReload(weaponState, nowMs) -> state          // completes after reloadMs; reserve -> mag
refillAmmo(weaponState) -> state                 // Max Ammo: mag=magSize, reserve=maxReserve
buyWallWeapon(player, id) -> player'             // owns id + full ammo (does NOT spend points)
rollMysteryBox(player, rng) -> { player, weaponId } // rng()∈[0,1) picks + grants a weapon
```
Base `reloadMs`/`rpm` are unmodified here — perk multipliers are applied by the **caller**
via `perks.effectiveReloadMs` / `effectiveRpm`. Do **not** import perks. Don't deduct points
(the caller uses `economy.spend`).

## Consumes
`player` / weapon-state shapes (frozen). No hard imports of other new modules.

## Consumed by
`shooting` (reads `weapon.damage`), `powerups` (Max Ammo uses `refillAmmo`), integration
(wall-buy prompts, reload, swap).

## Research
Sanity-check the WW2 weapon stats for plausibility, but **keep the plan's numbers**.

## Test plan (write failing first)
- `fire` blocks until `60000/rpm` ms elapsed; depletes mag; `didFire:false` at empty mag.
- `startReload`/`tickReload` timing; reserve→mag transfer is correct and clamped.
- `refillAmmo` tops mag and reserve.
- `buyWallWeapon` grants ownership + full ammo without touching points.
- `rollMysteryBox` is deterministic with a seeded `rng`; always returns a valid weapon id.
- Immutability throughout.

## Definition of done
Contract met · tests green · `npm test` green · commented · self-contained PR · report to
integration agent.
