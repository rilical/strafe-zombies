const clamp01 = value => Math.max(0, Math.min(1, value));
const clampTime = (value, dur) => Math.max(0, Math.min(dur, value));
const clean = value => Number(value.toFixed(6));

function points(entries) {
  return entries.map(([t, value]) => [t, value]);
}

function layer(wave, freq, gain) {
  return { wave, freq: points(freq), gain: points(gain) };
}

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return value;
}

/**
 * SFX — frozen plain-data recipes for the procedural WebAudio scheduler.
 *
 * Each preset is intentionally just data: short breakpoint curves that describe
 * the intended sound while leaving AudioContext creation and node scheduling to
 * the integration layer.
 */
export const SFX = deepFreeze({
  // Muzzle crack: a tiny white-noise blast plus a square-wave pitch drop.
  shoot: {
    dur: 0.1,
    layers: [
      layer("noise", [[0, 1800], [0.03, 900], [0.1, 500]], [[0, 0.8], [0.015, 0.5], [0.1, 0]]),
      layer("square", [[0, 220], [0.025, 120], [0.1, 80]], [[0, 0.45], [0.02, 0.2], [0.1, 0]]),
    ],
  },

  // Magazine handling: two soft triangle clicks spaced like a reload gesture.
  reload: {
    dur: 0.25,
    layers: [
      layer("triangle", [[0, 520], [0.06, 520], [0.25, 340]], [[0, 0.55], [0.04, 0], [0.12, 0], [0.16, 0.45], [0.25, 0]]),
    ],
  },

  // Body hit marker: a quick muted confirmation blip.
  hit: {
    dur: 0.08,
    layers: [
      layer("triangle", [[0, 700], [0.08, 520]], [[0, 0.5], [0.025, 0.25], [0.08, 0]]),
    ],
  },

  // Headshot marker: brighter and higher than the body-hit blip.
  headshot: {
    dur: 0.09,
    layers: [
      layer("square", [[0, 980], [0.035, 1320], [0.09, 880]], [[0, 0.65], [0.035, 0.45], [0.09, 0]]),
    ],
  },

  // Kill confirm: a clipped descending square chirp.
  kill: {
    dur: 0.16,
    layers: [
      layer("square", [[0, 420], [0.08, 260], [0.16, 180]], [[0, 0.55], [0.06, 0.45], [0.16, 0]]),
    ],
  },

  // Purchase success: two pleasant rising notes.
  buy: {
    dur: 0.22,
    layers: [
      layer("sine", [[0, 660], [0.11, 660], [0.12, 880], [0.22, 880]], [[0, 0.45], [0.08, 0], [0.12, 0.5], [0.22, 0]]),
    ],
  },

  // Purchase denied: a low buzzer with a hard-edged square tone.
  deny: {
    dur: 0.18,
    layers: [
      layer("square", [[0, 120], [0.18, 105]], [[0, 0.5], [0.14, 0.45], [0.18, 0]]),
    ],
  },

  // Player hurt: low noisy grunt layered with a falling triangle body.
  hurt: {
    dur: 0.24,
    layers: [
      layer("noise", [[0, 350], [0.24, 160]], [[0, 0.5], [0.08, 0.35], [0.24, 0]]),
      layer("triangle", [[0, 150], [0.24, 85]], [[0, 0.4], [0.1, 0.28], [0.24, 0]]),
    ],
  },

  // Zombie groan: low organic tone; buildVoice nudges pitch per rng draw.
  groan: {
    dur: 0.5,
    pitchVariance: 0.22,
    layers: [
      layer("triangle", [[0, 92], [0.24, 78], [0.5, 70]], [[0, 0], [0.08, 0.45], [0.36, 0.35], [0.5, 0]]),
      layer("sine", [[0, 56], [0.5, 48]], [[0, 0], [0.12, 0.3], [0.5, 0]]),
    ],
  },

  // Door/debris buy: a longer low rumble without implying physics here.
  door: {
    dur: 0.6,
    layers: [
      layer("noise", [[0, 180], [0.6, 90]], [[0, 0.55], [0.28, 0.4], [0.6, 0]]),
      layer("sine", [[0, 70], [0.6, 45]], [[0, 0.35], [0.32, 0.25], [0.6, 0]]),
    ],
  },

  // Power-up pickup: bright arcade arpeggio.
  powerup: {
    dur: 0.36,
    layers: [
      layer("triangle", [[0, 660], [0.12, 880], [0.24, 1320], [0.36, 1760]], [[0, 0.5], [0.1, 0.35], [0.22, 0.45], [0.36, 0]]),
    ],
  },

  // Round start: two-note tension sting.
  roundstart: {
    dur: 0.34,
    layers: [
      layer("sawtooth", [[0, 220], [0.16, 220], [0.17, 330], [0.34, 330]], [[0, 0.4], [0.14, 0], [0.17, 0.5], [0.34, 0]]),
    ],
  },

  // Nuke: deepest and longest voice, a boom plus fading blast noise.
  nuke: {
    dur: 0.8,
    layers: [
      layer("sine", [[0, 85], [0.12, 48], [0.8, 28]], [[0, 0.85], [0.16, 0.55], [0.8, 0]]),
      layer("noise", [[0, 260], [0.8, 70]], [[0, 0.75], [0.24, 0.35], [0.8, 0]]),
    ],
  },
});

/**
 * adsr — expand an attack/decay/sustain/release envelope into gain breakpoints.
 *
 * Durations are clamped into the voice duration and the release always ends at
 * `[dur, 0]`, which keeps the WebAudio scheduler from leaving a stuck gain.
 *
 * @param {Object} env - { attack, decay, sustain, release, peak = 1 }
 * @param {number} dur - Total voice duration in seconds
 * @returns {Array<[number, number]>} Ordered gain breakpoints
 */
export function adsr({ attack, decay, sustain, release, peak = 1 }, dur) {
  const safeDur = Math.max(0, dur);
  const attackEnd = clampTime(Math.max(0, attack), safeDur);
  const decayEnd = clampTime(attackEnd + Math.max(0, decay), safeDur);
  const sustainEnd = clampTime(Math.max(decayEnd, safeDur - Math.max(0, release)), safeDur);
  const sustainLevel = clamp01(sustain);
  const peakLevel = clamp01(peak);

  return [
    [0, 0],
    [clean(attackEnd), peakLevel],
    [clean(decayEnd), sustainLevel],
    [clean(sustainEnd), sustainLevel],
    [clean(safeDur), 0],
  ];
}

/**
 * buildVoice — expand a named preset into a fresh schedulable Voice.
 *
 * The returned object shares no mutable arrays with the frozen preset or with
 * other calls. When a preset declares pitch variance, one rng draw shifts every
 * frequency in that voice by the same musical wobble.
 *
 * @param {string} name - Preset key from SFX
 * @param {Function} rng - Deterministic RNG returning values in [0, 1)
 * @returns {{ dur: number, layers: Array }} Plain Voice plan for the renderer
 */
export function buildVoice(name, rng = Math.random) {
  const preset = SFX[name];
  if (!preset) {
    throw new RangeError(`Unknown SFX preset: ${name}`);
  }

  const pitchScale = preset.pitchVariance
    ? 1 + (rng() - 0.5) * preset.pitchVariance
    : 1;

  return {
    dur: preset.dur,
    layers: preset.layers.map(presetLayer => ({
      wave: presetLayer.wave,
      freq: presetLayer.freq.map(([t, hz]) => [t, clean(hz * pitchScale)]),
      gain: presetLayer.gain.map(([t, level]) => [t, level]),
    })),
  };
}
