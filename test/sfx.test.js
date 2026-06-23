import { describe, it, expect } from "vitest";
import { SFX, adsr, buildVoice } from "../src/sfx.js";

const REQUIRED_KEYS = [
  "shoot",
  "reload",
  "hit",
  "headshot",
  "kill",
  "buy",
  "deny",
  "hurt",
  "groan",
  "door",
  "powerup",
  "roundstart",
  "nuke",
];

const WAVES = new Set(["sine", "square", "sawtooth", "triangle", "noise"]);

function makeRng(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

function expectPlainData(value) {
  expect(typeof value).not.toBe("function");
  if (Array.isArray(value)) {
    for (const entry of value) expectPlainData(entry);
    return;
  }
  if (value && typeof value === "object") {
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    for (const entry of Object.values(value)) expectPlainData(entry);
  }
}

function expectOrderedBreakpoints(points, dur, { gain = false } = {}) {
  expect(Array.isArray(points)).toBe(true);
  expect(points.length).toBeGreaterThan(0);
  expect(points[0][0]).toBe(0);

  let previousTime = 0;
  for (const point of points) {
    expect(point).toHaveLength(2);
    const [time, value] = point;
    expect(time).toBeGreaterThanOrEqual(previousTime);
    expect(time).toBeGreaterThanOrEqual(0);
    expect(time).toBeLessThanOrEqual(dur);
    expect(Number.isFinite(value)).toBe(true);
    if (gain) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    previousTime = time;
  }
}

function expectValidVoice(voice) {
  expect(voice).toEqual({
    dur: expect.any(Number),
    layers: expect.any(Array),
  });
  expect(voice.dur).toBeGreaterThan(0);
  expect(voice.layers.length).toBeGreaterThan(0);

  for (const layer of voice.layers) {
    expect(WAVES.has(layer.wave)).toBe(true);
    expectOrderedBreakpoints(layer.freq, voice.dur);
    expectOrderedBreakpoints(layer.gain, voice.dur, { gain: true });
    expect(layer.gain.at(-1)[1]).toBe(0);
  }
}

function collectFrequencies(voice) {
  return voice.layers.flatMap(layer => layer.freq.map(([, hz]) => hz));
}

describe("SFX preset table", () => {
  it("has exactly the required frozen preset keys", () => {
    expect(Object.keys(SFX).sort()).toEqual([...REQUIRED_KEYS].sort());
    expect(Object.isFrozen(SFX)).toBe(true);
  });

  it("contains only plain JSON-able preset data", () => {
    expectPlainData(SFX);
  });
});

describe("buildVoice", () => {
  it("expands every preset into a valid schedulable Voice", () => {
    for (const key of REQUIRED_KEYS) {
      expectValidVoice(buildVoice(key, makeRng([0.5])));
    }
  });

  it("is deterministic when given the same seeded rng sequence", () => {
    for (const key of REQUIRED_KEYS) {
      const a = buildVoice(key, makeRng([0.1, 0.7, 0.3]));
      const b = buildVoice(key, makeRng([0.1, 0.7, 0.3]));
      expect(a).toEqual(b);
    }
  });

  it("varies groan pitch from rng so the horde does not sound identical", () => {
    const low = buildVoice("groan", makeRng([0.05]));
    const high = buildVoice("groan", makeRng([0.95]));

    expect(collectFrequencies(low)).not.toEqual(collectFrequencies(high));
  });

  it("throws RangeError for unknown sound names", () => {
    expect(() => buildVoice("missing")).toThrow(RangeError);
  });

  it("returns new objects and mutable arrays on each call", () => {
    const a = buildVoice("shoot", makeRng([0.5]));
    const b = buildVoice("shoot", makeRng([0.5]));

    expect(a).not.toBe(b);
    expect(a.layers).not.toBe(b.layers);
    expect(a.layers[0]).not.toBe(b.layers[0]);
    expect(a.layers[0].freq).not.toBe(b.layers[0].freq);
    expect(a.layers[0].gain).not.toBe(b.layers[0].gain);

    a.layers[0].gain[0][1] = 0.123;
    expect(b.layers[0].gain[0][1]).not.toBe(0.123);
  });
});

describe("adsr", () => {
  it("returns ordered attack, decay, sustain, and release breakpoints ending at 0", () => {
    expect(adsr({ attack: 0.1, decay: 0.2, sustain: 0.4, release: 0.3, peak: 0.8 }, 1)).toEqual([
      [0, 0],
      [0.1, 0.8],
      [0.3, 0.4],
      [0.7, 0.4],
      [1, 0],
    ]);
  });

  it("defaults peak to 1", () => {
    expect(adsr({ attack: 0.05, decay: 0.05, sustain: 0.25, release: 0.1 }, 0.4)[1]).toEqual([0.05, 1]);
  });

  it("clamps attack, decay, and release points when their sum exceeds dur", () => {
    const points = adsr({ attack: 0.4, decay: 0.4, sustain: 0.5, release: 0.4, peak: 0.9 }, 0.6);

    expectOrderedBreakpoints(points, 0.6, { gain: true });
    expect(points).toEqual([
      [0, 0],
      [0.4, 0.9],
      [0.6, 0.5],
      [0.6, 0.5],
      [0.6, 0],
    ]);
  });
});
