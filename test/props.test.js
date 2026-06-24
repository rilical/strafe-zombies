// test/props.test.js — TDD for src/props.js (in-world buyable billboard descriptors)
import { describe, it, expect } from 'vitest';
import { worldProps, propSprite } from '../src/props.js';
import { LEVEL } from '../src/level.js';

// Small handcrafted fixture — does not depend on exact map coordinates.
const FIXTURE = {
  perkMachines: [
    { id: 'perk-juggernog', perkId: 'jugg',      cost: 2500, cx:  2, cy:  3 },
    { id: 'perk-speedcola', perkId: 'speedCola', cost: 3000, cx: 12, cy:  3 },
    { id: 'perk-doubletap', perkId: 'doubleTap', cost: 2000, cx:  3, cy: 12 },
  ],
  box: { cx: 13, cy: 12 },
  mounts: [
    { id: 'm1', weaponId: 'kar98k',   cost:  200, cx:  5, cy:  7, faceX: -1, faceY:  0 },
    { id: 'm2', weaponId: 'carbine',  cost:  600, cx:  7, cy:  5, faceX:  0, faceY: -1 },
    { id: 'm3', weaponId: 'thompson', cost: 1200, cx: 10, cy:  8, faceX:  1, faceY:  0 },
  ],
};

const WORLD = {}; // worldProps ignores world state for static machines

// ─── worldProps ──────────────────────────────────────────────────────────────

describe('worldProps — counts', () => {
  it('returns one prop per perk machine', () => {
    const props = worldProps(FIXTURE, WORLD);
    expect(props.filter(p => p.kind === 'perk')).toHaveLength(3);
  });

  it('returns exactly one box prop', () => {
    const props = worldProps(FIXTURE, WORLD);
    expect(props.filter(p => p.kind === 'box')).toHaveLength(1);
  });

  it('returns one prop per wall-gun mount', () => {
    const props = worldProps(FIXTURE, WORLD);
    expect(props.filter(p => p.kind === 'mount')).toHaveLength(3);
  });
});

describe('worldProps — positions', () => {
  it('each perk prop sits at cx+0.5, cy+0.5', () => {
    const props = worldProps(FIXTURE, WORLD);
    for (const m of FIXTURE.perkMachines) {
      const prop = props.find(p => p.id === m.id);
      expect(prop.x).toBeCloseTo(m.cx + 0.5);
      expect(prop.y).toBeCloseTo(m.cy + 0.5);
    }
  });

  it('box prop sits at cx+0.5, cy+0.5', () => {
    const props = worldProps(FIXTURE, WORLD);
    const box = props.find(p => p.kind === 'box');
    expect(box.x).toBeCloseTo(FIXTURE.box.cx + 0.5);
    expect(box.y).toBeCloseTo(FIXTURE.box.cy + 0.5);
  });

  it('each mount prop sits at cx+0.5, cy+0.5', () => {
    const props = worldProps(FIXTURE, WORLD);
    for (const m of FIXTURE.mounts) {
      const prop = props.find(p => p.id === m.id);
      expect(prop.x).toBeCloseTo(m.cx + 0.5);
      expect(prop.y).toBeCloseTo(m.cy + 0.5);
    }
  });
});

describe('worldProps — perk metadata', () => {
  it('juggernog maps to palette #c0392b, label Juggernog, glow:true', () => {
    const props = worldProps(FIXTURE, WORLD);
    const jugg = props.find(p => p.id === 'perk-juggernog');
    expect(jugg).toBeDefined();
    expect(jugg.palette).toBe('#c0392b');
    expect(jugg.label).toBe('Juggernog');
    expect(jugg.glow).toBe(true);
  });

  it('speedCola maps to palette #2ecc71, label Speed Cola, glow:true', () => {
    const props = worldProps(FIXTURE, WORLD);
    const sc = props.find(p => p.id === 'perk-speedcola');
    expect(sc.palette).toBe('#2ecc71');
    expect(sc.label).toBe('Speed Cola');
    expect(sc.glow).toBe(true);
  });

  it('doubleTap maps to palette #e1b12c, label Double Tap, glow:true', () => {
    const props = worldProps(FIXTURE, WORLD);
    const dt = props.find(p => p.id === 'perk-doubletap');
    expect(dt.palette).toBe('#e1b12c');
    expect(dt.label).toBe('Double Tap');
    expect(dt.glow).toBe(true);
  });
});

describe('worldProps — box metadata', () => {
  it('box prop has id:"box", wooden palette, label:"?", glow:true', () => {
    const props = worldProps(FIXTURE, WORLD);
    const box = props.find(p => p.kind === 'box');
    expect(box.id).toBe('box');
    expect(box.palette).toEqual(['#6b4f2a', '#caa15a']);
    expect(box.label).toBe('?');
    expect(box.glow).toBe(true);
  });
});

describe('worldProps — mount metadata', () => {
  it('mount m1 has label equal to its weaponId and glow:false', () => {
    const props = worldProps(FIXTURE, WORLD);
    const m1 = props.find(p => p.id === 'm1');
    expect(m1.kind).toBe('mount');
    expect(m1.label).toBe('kar98k');
    expect(m1.glow).toBe(false);
  });

  it('mount m2 carries its own weaponId as label', () => {
    const props = worldProps(FIXTURE, WORLD);
    const m2 = props.find(p => p.id === 'm2');
    expect(m2.label).toBe('carbine');
  });

  it('all mounts use gunmetal palette and glow:false', () => {
    const props = worldProps(FIXTURE, WORLD);
    for (const p of props.filter(x => x.kind === 'mount')) {
      expect(p.palette).toEqual(['#2b2f36', '#6b7280']);
      expect(p.glow).toBe(false);
    }
  });
});

describe('worldProps — determinism and order', () => {
  it('output order is stable across calls (perks, then box, then mounts)', () => {
    const a = worldProps(FIXTURE, WORLD).map(p => p.id);
    const b = worldProps(FIXTURE, WORLD).map(p => p.id);
    expect(a).toEqual(b);
  });

  it('perks come before box, box before mounts', () => {
    const props = worldProps(FIXTURE, WORLD);
    const perkLast  = props.findLastIndex(p => p.kind === 'perk');
    const boxIdx    = props.findIndex(p => p.kind === 'box');
    const mountFirst = props.findIndex(p => p.kind === 'mount');
    expect(perkLast).toBeLessThan(boxIdx);
    expect(boxIdx).toBeLessThan(mountFirst);
  });
});

describe('worldProps — works with the real LEVEL', () => {
  it('counts match real LEVEL arrays', () => {
    const props = worldProps(LEVEL, WORLD);
    expect(props.filter(p => p.kind === 'perk'  )).toHaveLength(LEVEL.perkMachines.length);
    expect(props.filter(p => p.kind === 'box'   )).toHaveLength(1);
    expect(props.filter(p => p.kind === 'mount' )).toHaveLength(LEVEL.mounts.length);
  });
});

// ─── propSprite ───────────────────────────────────────────────────────────────

describe('propSprite — structure', () => {
  const KINDS = ['perk', 'box', 'mount'];

  it('returns an object with a bands array for every kind', () => {
    for (const kind of KINDS) {
      const palette = kind === 'mount' ? ['#2b2f36', '#6b7280'] : '#c0392b';
      const sprite = propSprite(kind, palette, {});
      expect(Array.isArray(sprite.bands)).toBe(true);
      expect(sprite.bands.length).toBeGreaterThan(0);
    }
  });

  it('returns at least 3 bands (body + panel + label plate) for every kind', () => {
    for (const kind of KINDS) {
      const palette = kind === 'mount' ? ['#2b2f36', '#6b7280'] : '#c0392b';
      const sprite = propSprite(kind, palette, {});
      expect(sprite.bands.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('propSprite — normalized coordinates', () => {
  const KINDS = ['perk', 'box', 'mount'];

  it('all band coordinates stay within [0,1]', () => {
    for (const kind of KINDS) {
      const palette = kind === 'mount' ? ['#2b2f36', '#6b7280'] : ['#c0392b', '#e74c3c'];
      const sprite = propSprite(kind, palette, {});
      for (const band of sprite.bands) {
        expect(band.uMin).toBeGreaterThanOrEqual(0);
        expect(band.uMax).toBeLessThanOrEqual(1);
        expect(band.vMin).toBeGreaterThanOrEqual(0);
        expect(band.vMax).toBeLessThanOrEqual(1);
        expect(band.uMin).toBeLessThanOrEqual(band.uMax);
        expect(band.vMin).toBeLessThanOrEqual(band.vMax);
      }
    }
  });
});

describe('propSprite — band fields', () => {
  it('every band has a color field', () => {
    for (const kind of ['perk', 'box', 'mount']) {
      const palette = kind === 'mount' ? ['#2b2f36', '#6b7280'] : '#e1b12c';
      const sprite = propSprite(kind, palette, {});
      for (const band of sprite.bands) {
        expect(band).toHaveProperty('color');
        expect(band).toHaveProperty('uMin');
        expect(band).toHaveProperty('uMax');
        expect(band).toHaveProperty('vMin');
        expect(band).toHaveProperty('vMax');
      }
    }
  });

  it('accepts array palette and uses base color for body', () => {
    const sprite = propSprite('box', ['#6b4f2a', '#caa15a'], {});
    // first band (body) should use the base color
    expect(sprite.bands[0].color).toBe('#6b4f2a');
  });

  it('default frame arg is optional (no crash without third argument)', () => {
    expect(() => propSprite('perk', '#c0392b')).not.toThrow();
  });
});
