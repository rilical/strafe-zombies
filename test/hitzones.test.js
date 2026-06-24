import { describe, it, expect } from 'vitest';
import { HEAD_TOP, HEAD_BOTTOM, isHeadshot, isBodyHit } from '../src/hitzones.js';

// A convenient billboard at canvas y=100..500 (height 400 px).
const START = 100;
const END   = 500;
const H     = END - START; // 400 px

// Expected head band with defaults:
//   topY  = 100 + 400 * 0.02 = 108
//   botY  = 100 + 400 * 0.30 = 220
const DEFAULT_TOP = START + H * HEAD_TOP;    // 108
const DEFAULT_BOT = START + H * HEAD_BOTTOM; // 220

describe('constants', () => {
  it('HEAD_TOP is 0.02', () => expect(HEAD_TOP).toBe(0.02));
  it('HEAD_BOTTOM is 0.30', () => expect(HEAD_BOTTOM).toBe(0.30));
});

describe('isHeadshot — default band', () => {
  it('cursor inside head band → true', () => {
    expect(isHeadshot(START, END, 150)).toBe(true);
  });

  it('cursor in torso (below botY) → false', () => {
    expect(isHeadshot(START, END, 300)).toBe(false);
  });

  it('cursor above head (above topY) → false', () => {
    // cursorY < topY: aim over the shoulder
    expect(isHeadshot(START, END, START)).toBe(false);
  });

  it('top edge inclusive: cursorY === topY → true', () => {
    expect(isHeadshot(START, END, DEFAULT_TOP)).toBe(true);
  });

  it('bottom edge inclusive: cursorY === botY → true', () => {
    expect(isHeadshot(START, END, DEFAULT_BOT)).toBe(true);
  });

  it('just below top edge → false', () => {
    expect(isHeadshot(START, END, DEFAULT_TOP - 0.001)).toBe(false);
  });

  it('just above bottom edge → false', () => {
    expect(isHeadshot(START, END, DEFAULT_BOT + 0.001)).toBe(false);
  });
});

describe('isHeadshot — degenerate / zero-height billboard', () => {
  it('h === 0 (drawStartY === drawEndY) → false', () => {
    expect(isHeadshot(200, 200, 200)).toBe(false);
  });

  it('drawEndY < drawStartY → false', () => {
    expect(isHeadshot(300, 100, 200)).toBe(false);
  });
});

describe('isHeadshot — opts overrides', () => {
  it('opts.top and opts.bottom shift the band', () => {
    // Custom band: 50 %–70 % of the billboard height
    const custom = { top: 0.5, bottom: 0.7 };
    const newTop = START + H * 0.5; // 300
    const newBot = START + H * 0.7; // 380

    expect(isHeadshot(START, END, newTop, custom)).toBe(true);  // at edge
    expect(isHeadshot(START, END, newBot, custom)).toBe(true);  // at edge
    expect(isHeadshot(START, END, 340, custom)).toBe(true);     // inside
    // Old default head region is no longer a head with these opts
    expect(isHeadshot(START, END, 150, custom)).toBe(false);
  });

  it('opts.top alone overrides only top; bottom defaults to HEAD_BOTTOM', () => {
    const custom = { top: 0.1 };
    const newTop = START + H * 0.1; // 140
    const defBot = DEFAULT_BOT;      // 220
    expect(isHeadshot(START, END, 180, custom)).toBe(true);
    expect(isHeadshot(START, END, defBot, custom)).toBe(true);
    expect(isHeadshot(START, END, newTop - 1, custom)).toBe(false);
  });
});

describe('isHeadshot — tiny far-away billboard', () => {
  // A billboard only 5 px tall (deeply receding zombie):
  //   topY = 200 + 5 * 0.02 = 200.1
  //   botY = 200 + 5 * 0.30 = 201.5
  it('correctly classifies inside the head band of a tiny sprite', () => {
    const s = 200, e = 205; // 5 px tall
    const tinyTop = s + (e - s) * HEAD_TOP;    // 200.1
    const tinyBot = s + (e - s) * HEAD_BOTTOM; // 201.5
    expect(isHeadshot(s, e, 200.5)).toBe(true);  // mid of head band
    expect(isHeadshot(s, e, tinyTop)).toBe(true); // top edge inclusive
    expect(isHeadshot(s, e, tinyBot)).toBe(true); // bottom edge inclusive
    expect(isHeadshot(s, e, 203)).toBe(false);   // torso
    expect(isHeadshot(s, e, s)).toBe(false);      // above head
  });
});

describe('isHeadshot — purity', () => {
  it('does not mutate opts', () => {
    const opts = { top: 0.1, bottom: 0.4 };
    const before = JSON.stringify(opts);
    isHeadshot(START, END, 200, opts);
    expect(JSON.stringify(opts)).toBe(before);
  });

  it('works with plain numbers — no object coercion', () => {
    // All args are numbers; function must not access any properties except opts
    expect(typeof isHeadshot(100, 500, 150)).toBe('boolean');
  });
});

describe('isBodyHit — vertical billboard overlap', () => {
  it('is true within the band and inclusive at both edges', () => {
    expect(isBodyHit(START, END, 300)).toBe(true);   // mid-band
    expect(isBodyHit(START, END, START)).toBe(true);  // top edge
    expect(isBodyHit(START, END, END)).toBe(true);    // bottom edge
  });

  it('is false above the head or below the feet (aiming at ceiling/floor)', () => {
    expect(isBodyHit(START, END, START - 1)).toBe(false);
    expect(isBodyHit(START, END, END + 1)).toBe(false);
  });

  it('is false for a degenerate billboard (h <= 0)', () => {
    expect(isBodyHit(300, 300, 300)).toBe(false);
    expect(isBodyHit(400, 300, 350)).toBe(false);
  });
});
