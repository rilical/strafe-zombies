import { describe, it, expect } from 'vitest';
import { wallShade, themeForCell } from '../src/walltex.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Assert every channel is an integer in [0, 255]. */
function validRgb(rgb) {
  const [r, g, b] = rgb;
  return (
    Number.isInteger(r) && r >= 0 && r <= 255 &&
    Number.isInteger(g) && g >= 0 && g <= 255 &&
    Number.isInteger(b) && b >= 0 && b <= 255
  );
}

// ── themeForCell ──────────────────────────────────────────────────────────────

describe('themeForCell', () => {
  it('returns "brick" for NW quadrant (cx<8, cy<8)', () => {
    expect(themeForCell(0, 0)).toBe('brick');
    expect(themeForCell(7, 7)).toBe('brick');
    expect(themeForCell(3, 5)).toBe('brick');
  });

  it('returns "concrete" for NE quadrant (cx>=8, cy<8)', () => {
    expect(themeForCell(8, 0)).toBe('concrete');
    expect(themeForCell(15, 7)).toBe('concrete');
    expect(themeForCell(10, 3)).toBe('concrete');
  });

  it('returns "planks" for SW quadrant (cx<8, cy>=8)', () => {
    expect(themeForCell(0, 8)).toBe('planks');
    expect(themeForCell(7, 15)).toBe('planks');
    expect(themeForCell(4, 12)).toBe('planks');
  });

  it('returns "blood" for SE quadrant (cx>=8, cy>=8)', () => {
    expect(themeForCell(8, 8)).toBe('blood');
    expect(themeForCell(15, 15)).toBe('blood');
    expect(themeForCell(11, 10)).toBe('blood');
  });
});

// ── wallShade — basic contracts ───────────────────────────────────────────────

describe('wallShade — determinism', () => {
  const themes = ['brick', 'concrete', 'planks', 'blood'];
  for (const theme of themes) {
    it(`${theme}: same args produce identical rgb`, () => {
      const a = wallShade(theme, 0, 0.37, 0.62);
      const b = wallShade(theme, 0, 0.37, 0.62);
      expect(a).toEqual(b);
    });
  }
});

describe('wallShade — channel bounds [0,255]', () => {
  const themes = ['brick', 'concrete', 'planks', 'blood'];
  const samples = [
    [0, 0.0, 0.0], [0, 0.5, 0.5], [0, 1.0, 1.0],
    [1, 0.25, 0.75], [1, 0.99, 0.01],
  ];
  for (const theme of themes) {
    for (const [side, u, v] of samples) {
      it(`${theme} side=${side} u=${u} v=${v} channels in [0,255]`, () => {
        expect(validRgb(wallShade(theme, side, u, v))).toBe(true);
      });
    }
  }
});

// ── wallShade — side=1 darker than side=0 ────────────────────────────────────

describe('wallShade — side=1 darker than side=0', () => {
  const themes = ['brick', 'concrete', 'planks', 'blood'];
  const uvs = [[0.3, 0.3], [0.6, 0.6], [0.1, 0.9]];
  for (const theme of themes) {
    for (const [u, v] of uvs) {
      it(`${theme} u=${u} v=${v}: side=1 luminance < side=0 luminance`, () => {
        const [r0, g0, b0] = wallShade(theme, 0, u, v);
        const [r1, g1, b1] = wallShade(theme, 1, u, v);
        const lum0 = r0 + g0 + b0;
        const lum1 = r1 + g1 + b1;
        expect(lum1).toBeLessThan(lum0);
      });
    }
  }
});

// ── wallShade — themes differ ─────────────────────────────────────────────────

describe('wallShade — themes produce distinct colours', () => {
  const themes = ['brick', 'concrete', 'planks', 'blood'];
  const u = 0.4, v = 0.4;

  it('all four themes give different rgb at the same (side,u,v)', () => {
    const results = themes.map(t => wallShade(t, 0, u, v).join(','));
    // All four must be distinct
    const unique = new Set(results);
    expect(unique.size).toBe(4);
  });
});

// ── wallShade — brick mortar courses ─────────────────────────────────────────

describe('wallShade — brick mortar courses', () => {
  // Sample brightness across v at fixed u=0.5; the brick pattern must produce
  // at least 2 clear dips (mortar lines) in 32 samples across [0,1].
  it('has periodic mortar dips across v (at least 2 dark courses in 32 samples)', () => {
    const u = 0.5;
    const samples = 32;
    const brightnesses = [];
    for (let i = 0; i < samples; i++) {
      const v = i / (samples - 1);
      const [r, g, b] = wallShade('brick', 0, u, v);
      brightnesses.push(r + g + b);
    }
    const avg = brightnesses.reduce((a, b) => a + b, 0) / samples;
    // Count samples clearly below average (mortar is darker than the brick body)
    const dips = brightnesses.filter(b => b < avg * 0.88).length;
    expect(dips).toBeGreaterThanOrEqual(2);
  });

  it('mortar dips are periodic — repeats at least once across v', () => {
    // Check that the minimum-brightness positions are roughly evenly spaced
    const u = 0.5;
    const N = 64;
    const bri = [];
    for (let i = 0; i < N; i++) {
      const v = i / (N - 1);
      const [r, g, b] = wallShade('brick', 0, u, v);
      bri.push({ idx: i, val: r + g + b });
    }
    const avg = bri.reduce((a, x) => a + x.val, 0) / N;
    // Collect dark-zone centres
    const dips = [];
    let inDip = false;
    for (let i = 0; i < N; i++) {
      if (bri[i].val < avg * 0.88) {
        if (!inDip) { dips.push(i); inDip = true; }
      } else {
        inDip = false;
      }
    }
    // Expect at least 2 separate mortar courses
    expect(dips.length).toBeGreaterThanOrEqual(2);
    // And gaps between them should be roughly equal (period ±50%)
    if (dips.length >= 2) {
      const gaps = [];
      for (let i = 1; i < dips.length; i++) gaps.push(dips[i] - dips[i - 1]);
      const minGap = Math.min(...gaps);
      const maxGap = Math.max(...gaps);
      expect(maxGap / minGap).toBeLessThan(2.0); // within 2× period spread
    }
  });
});

// ── wallShade — planks have vertical seams ───────────────────────────────────

describe('wallShade — planks vertical seams', () => {
  it('has at least 2 brightness dips across u (plank seams) in 32 samples', () => {
    const v = 0.5;
    const N = 32;
    const bri = [];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const [r, g, b] = wallShade('planks', 0, u, v);
      bri.push(r + g + b);
    }
    const avg = bri.reduce((a, b) => a + b, 0) / N;
    const dips = bri.filter(b => b < avg * 0.92).length;
    expect(dips).toBeGreaterThanOrEqual(2);
  });
});
