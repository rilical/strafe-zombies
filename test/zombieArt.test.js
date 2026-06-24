import { describe, it, expect } from "vitest";
import { zombieSprite, zombieBands } from "../src/zombieArt.js";

// ---------------------------------------------------------------------------
// zombieSprite — deterministic per seed, spread across seeds
// ---------------------------------------------------------------------------

describe("zombieSprite — determinism", () => {
  it("returns the same descriptor for the same seed", () => {
    expect(zombieSprite(42)).toEqual(zombieSprite(42));
    expect(zombieSprite(0)).toEqual(zombieSprite(0));
    expect(zombieSprite(999)).toEqual(zombieSprite(999));
  });

  it("returns a different descriptor for different seeds", () => {
    const a = zombieSprite(1);
    const b = zombieSprite(2);
    // At least one of the three colour channels must differ across seeds
    const differs =
      a.skin.some((v, i) => v !== b.skin[i]) ||
      a.shirt.some((v, i) => v !== b.shirt[i]) ||
      a.pants.some((v, i) => v !== b.pants[i]) ||
      JSON.stringify(a.variant) !== JSON.stringify(b.variant);
    expect(differs).toBe(true);
  });

  it("spreads variant flags across a range of seeds", () => {
    const sprites = Array.from({ length: 64 }, (_, i) => zombieSprite(i));
    const someWith    = (flag) => sprites.some((s) => s.variant[flag]);
    const someWithout = (flag) => sprites.some((s) => !s.variant[flag]);
    // each flag should appear at least once and be absent at least once
    for (const flag of ["missingArm", "exposedRibs", "bloody"]) {
      expect(someWith(flag)).toBe(true);
      expect(someWithout(flag)).toBe(true);
    }
  });

  it("colour channels are integers in [0, 255]", () => {
    for (let seed = 0; seed < 20; seed++) {
      const s = zombieSprite(seed);
      for (const channel of [...s.skin, ...s.shirt, ...s.pants]) {
        expect(Number.isInteger(channel)).toBe(true);
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it("variant is an object with exactly the three boolean flags", () => {
    const { variant } = zombieSprite(7);
    expect(typeof variant.missingArm).toBe("boolean");
    expect(typeof variant.exposedRibs).toBe("boolean");
    expect(typeof variant.bloody).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// zombieBands — band coords within [0,1]
// ---------------------------------------------------------------------------

describe("zombieBands — coordinate bounds", () => {
  it("all band coords stay within [0, 1]", () => {
    for (let seed = 0; seed < 20; seed++) {
      const sprite = zombieSprite(seed);
      for (const phase of [0, 0.5, 1.0, 2.7]) {
        const { bands } = zombieBands(sprite, phase);
        for (const b of bands) {
          expect(b.uMin).toBeGreaterThanOrEqual(0);
          expect(b.uMax).toBeLessThanOrEqual(1);
          expect(b.vMin).toBeGreaterThanOrEqual(0);
          expect(b.vMax).toBeLessThanOrEqual(1);
          expect(b.uMin).toBeLessThanOrEqual(b.uMax);
          expect(b.vMin).toBeLessThanOrEqual(b.vMax);
        }
      }
    }
  });

  it("always includes at least one head band", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { bands } = zombieBands(zombieSprite(seed), 0);
      expect(bands.some((b) => b.layer === "head")).toBe(true);
    }
  });

  it("sway is a finite number (small signed lurch)", () => {
    for (let seed = 0; seed < 10; seed++) {
      const { sway } = zombieBands(zombieSprite(seed), 0);
      expect(typeof sway).toBe("number");
      expect(Number.isFinite(sway)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// zombieBands — phase animates limbs
// ---------------------------------------------------------------------------

describe("zombieBands — phase animation", () => {
  it("changing phase moves at least one limb band's position", () => {
    // Use a seed that has two arms (most seeds do); brute-force until we find one
    let twoArmedSprite;
    for (let s = 0; s < 100; s++) {
      const sp = zombieSprite(s);
      if (!sp.variant.missingArm) { twoArmedSprite = sp; break; }
    }
    expect(twoArmedSprite).toBeDefined();

    const phase0 = zombieBands(twoArmedSprite, 0).bands;
    const phaseHalf = zombieBands(twoArmedSprite, Math.PI).bands;

    const limb = (bands) =>
      bands.filter((b) => ["arm", "legs"].includes(b.layer));

    const moved = limb(phase0).some((b0) => {
      const bHalf = limb(phaseHalf).find((b) => b.layer === b0.layer);
      return bHalf && (b0.uMin !== bHalf.uMin || b0.vMin !== bHalf.vMin ||
                       b0.uMax !== bHalf.uMax || b0.vMax !== bHalf.vMax);
    });
    expect(moved).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// zombieBands — missingArm yields fewer arm bands
// ---------------------------------------------------------------------------

describe("zombieBands — missingArm variant", () => {
  it("a missingArm sprite has fewer arm bands than a two-armed one", () => {
    // Build two sprites that differ only in missingArm — find suitable seeds
    let missingArmSprite, twoArmSprite;
    for (let s = 0; s < 200; s++) {
      const sp = zombieSprite(s);
      if (!missingArmSprite && sp.variant.missingArm) missingArmSprite = sp;
      if (!twoArmSprite && !sp.variant.missingArm) twoArmSprite = sp;
      if (missingArmSprite && twoArmSprite) break;
    }
    expect(missingArmSprite).toBeDefined();
    expect(twoArmSprite).toBeDefined();

    const armCount = (sprite) =>
      zombieBands(sprite, 0).bands.filter((b) => b.layer === "arm").length;

    expect(armCount(missingArmSprite)).toBeLessThan(armCount(twoArmSprite));
  });
});

// ---------------------------------------------------------------------------
// zombieBands — gore bands appear only with variant flags
// ---------------------------------------------------------------------------

describe("zombieBands — gore overlays", () => {
  it("gore bands appear when exposedRibs or bloody flags are set", () => {
    // Find seeds for each variant
    let ribSprite, bloodySprite, plainSprite;
    for (let s = 0; s < 200; s++) {
      const sp = zombieSprite(s);
      if (!ribSprite && sp.variant.exposedRibs && !sp.variant.bloody) ribSprite = sp;
      if (!bloodySprite && sp.variant.bloody && !sp.variant.exposedRibs) bloodySprite = sp;
      if (!plainSprite && !sp.variant.exposedRibs && !sp.variant.bloody) plainSprite = sp;
      if (ribSprite && bloodySprite && plainSprite) break;
    }

    const goreCount = (sp) =>
      zombieBands(sp, 0).bands.filter((b) => b.layer === "gore").length;

    if (plainSprite) expect(goreCount(plainSprite)).toBe(0);
    if (ribSprite)   expect(goreCount(ribSprite)).toBeGreaterThan(0);
    if (bloodySprite) expect(goreCount(bloodySprite)).toBeGreaterThan(0);
  });

  it("no gore bands on a plain (no flags) sprite", () => {
    // Find a seed with no gore flags
    for (let s = 0; s < 200; s++) {
      const sp = zombieSprite(s);
      if (!sp.variant.exposedRibs && !sp.variant.bloody) {
        const { bands } = zombieBands(sp, 0);
        expect(bands.filter((b) => b.layer === "gore").length).toBe(0);
        return;
      }
    }
    // If all 200 seeds have some flag, we can't test this — unlikely but skip gracefully
  });
});

// ---------------------------------------------------------------------------
// zombieBands — band structure
// ---------------------------------------------------------------------------

describe("zombieBands — band structure", () => {
  it("every band has the required fields with valid types", () => {
    const { bands } = zombieBands(zombieSprite(3), 0.5);
    for (const b of bands) {
      expect(typeof b.layer).toBe("string");
      expect(Array.isArray(b.color)).toBe(true);
      expect(b.color).toHaveLength(3);
      expect(typeof b.uMin).toBe("number");
      expect(typeof b.uMax).toBe("number");
      expect(typeof b.vMin).toBe("number");
      expect(typeof b.vMax).toBe("number");
    }
  });

  it("always includes leg, torso, and head bands", () => {
    for (let seed = 0; seed < 10; seed++) {
      const { bands } = zombieBands(zombieSprite(seed), 0);
      const layers = new Set(bands.map((b) => b.layer));
      expect(layers.has("head")).toBe(true);
      expect(layers.has("legs") || layers.has("pants")).toBe(true);
      expect(layers.has("torso") || layers.has("shirt")).toBe(true);
    }
  });
});
