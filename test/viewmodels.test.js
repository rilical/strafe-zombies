import { describe, it, expect } from 'vitest';
import { viewmodel } from '../src/viewmodels.js';

const WEAPON_IDS = ['m1911', 'kar98k', 'carbine', 'thompson', 'trench', 'bar', 'raygun'];

// --- helpers ---

function shapeCoords(shape) {
  // Return all significant x and y values for bounds-checking.
  if (shape.type === 'rect') {
    return {
      xs: [shape.x, shape.x + shape.w],
      ys: [shape.y, shape.y + shape.h],
    };
  }
  // poly
  return {
    xs: shape.points.map(([px]) => px),
    ys: shape.points.map(([, py]) => py),
  };
}

function allCoordsInUnitSquare(shapes) {
  for (const s of shapes) {
    const { xs, ys } = shapeCoords(s);
    for (const x of xs) if (x < 0 || x > 1) return false;
    for (const y of ys) if (y < 0 || y > 1) return false;
  }
  return true;
}

// --- tests ---

describe('viewmodel — unknown id', () => {
  it('throws RangeError for an unrecognised weapon id', () => {
    expect(() => viewmodel('blaster')).toThrow(RangeError);
  });

  it('throws RangeError for empty string', () => {
    expect(() => viewmodel('')).toThrow(RangeError);
  });
});

describe('viewmodel — neutral frame (all 7 weapons)', () => {
  for (const id of WEAPON_IDS) {
    it(`${id}: returns at least one shape`, () => {
      const { shapes } = viewmodel(id);
      expect(shapes.length).toBeGreaterThanOrEqual(1);
    });

    it(`${id}: muzzle x and y are in [0,1]`, () => {
      const { muzzle } = viewmodel(id);
      expect(muzzle.x).toBeGreaterThanOrEqual(0);
      expect(muzzle.x).toBeLessThanOrEqual(1);
      expect(muzzle.y).toBeGreaterThanOrEqual(0);
      expect(muzzle.y).toBeLessThanOrEqual(1);
    });

    it(`${id}: all neutral-frame shape coords within [0,1]`, () => {
      const { shapes } = viewmodel(id);
      expect(allCoordsInUnitSquare(shapes)).toBe(true);
    });

    it(`${id}: each shape has a recognised type`, () => {
      const { shapes } = viewmodel(id);
      for (const s of shapes) {
        expect(['rect', 'poly']).toContain(s.type);
      }
    });

    it(`${id}: each rect shape has x, y, w, h, color`, () => {
      const { shapes } = viewmodel(id);
      for (const s of shapes.filter(sh => sh.type === 'rect')) {
        expect(typeof s.x).toBe('number');
        expect(typeof s.y).toBe('number');
        expect(typeof s.w).toBe('number');
        expect(typeof s.h).toBe('number');
        expect(typeof s.color).toBe('string');
        expect(s.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it(`${id}: each poly shape has points array and color`, () => {
      const { shapes } = viewmodel(id);
      for (const s of shapes.filter(sh => sh.type === 'poly')) {
        expect(Array.isArray(s.points)).toBe(true);
        expect(s.points.length).toBeGreaterThanOrEqual(3);
        expect(typeof s.color).toBe('string');
        expect(s.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  }
});

describe('viewmodel — raygun glow', () => {
  it('raygun has at least one shape with glow:true', () => {
    const { shapes } = viewmodel('raygun');
    const glowing = shapes.filter(s => s.glow === true);
    expect(glowing.length).toBeGreaterThanOrEqual(1);
  });

  it('raygun glow shape has a green-ish color', () => {
    const { shapes } = viewmodel('raygun');
    const glowing = shapes.filter(s => s.glow === true);
    // Green channel is dominant — second pair of hex digits > first pair
    for (const s of glowing) {
      const r = parseInt(s.color.slice(1, 3), 16);
      const g = parseInt(s.color.slice(3, 5), 16);
      expect(g).toBeGreaterThan(r);
    }
  });
});

describe('viewmodel — recoil frame', () => {
  for (const id of WEAPON_IDS) {
    it(`${id}: recoil=1 shifts shape y coords downward vs neutral`, () => {
      const neutral = viewmodel(id);
      const recoiled = viewmodel(id, { recoil: 1 });
      // At least the first shape's y should be greater (pushed down)
      const ny = neutral.shapes[0].type === 'rect'
        ? neutral.shapes[0].y
        : neutral.shapes[0].points[0][1];
      const ry = recoiled.shapes[0].type === 'rect'
        ? recoiled.shapes[0].y
        : recoiled.shapes[0].points[0][1];
      expect(ry).toBeGreaterThan(ny);
    });

    it(`${id}: recoil=1 shifts muzzle y downward vs neutral`, () => {
      const neutral = viewmodel(id);
      const recoiled = viewmodel(id, { recoil: 1 });
      expect(recoiled.muzzle.y).toBeGreaterThan(neutral.muzzle.y);
    });
  }
});

describe('viewmodel — bob frame', () => {
  it('positive bob.x shifts all rect shape x coords right', () => {
    const neutral = viewmodel('m1911');
    const bobbed  = viewmodel('m1911', { bob: { x: 0.02, y: 0 } });
    for (let i = 0; i < neutral.shapes.length; i++) {
      const ns = neutral.shapes[i];
      const bs = bobbed.shapes[i];
      if (ns.type === 'rect') {
        expect(bs.x).toBeCloseTo(ns.x + 0.02, 10);
      } else {
        expect(bs.points[0][0]).toBeCloseTo(ns.points[0][0] + 0.02, 10);
      }
    }
  });

  it('positive bob.y shifts muzzle y down', () => {
    const neutral = viewmodel('thompson');
    const bobbed  = viewmodel('thompson', { bob: { x: 0, y: 0.03 } });
    expect(bobbed.muzzle.y).toBeCloseTo(neutral.muzzle.y + 0.03, 10);
  });

  it('zero bob is identical to no bob', () => {
    const a = viewmodel('kar98k');
    const b = viewmodel('kar98k', { bob: { x: 0, y: 0 } });
    expect(b.muzzle).toEqual(a.muzzle);
    expect(b.shapes[0]).toEqual(a.shapes[0]);
  });
});

describe('viewmodel — combined recoil + bob', () => {
  it('recoil and bob stack additively on y', () => {
    const neutral  = viewmodel('bar');
    const combined = viewmodel('bar', { recoil: 0.5, bob: { x: 0, y: 0.01 } });
    const expectedDy = 0.5 * 0.06 + 0.01;
    const ny = neutral.shapes[0].type === 'rect'
      ? neutral.shapes[0].y
      : neutral.shapes[0].points[0][1];
    const cy = combined.shapes[0].type === 'rect'
      ? combined.shapes[0].y
      : combined.shapes[0].points[0][1];
    expect(cy).toBeCloseTo(ny + expectedDy, 10);
  });
});

describe('viewmodel — shape immutability', () => {
  it('calling viewmodel twice returns independent shape objects', () => {
    const a = viewmodel('trench');
    const b = viewmodel('trench');
    if (a.shapes[0].type === 'rect') {
      a.shapes[0].x = 9999;
      expect(b.shapes[0].x).not.toBe(9999);
    } else {
      a.shapes[0].points[0][0] = 9999;
      expect(b.shapes[0].points[0][0]).not.toBe(9999);
    }
  });
});
