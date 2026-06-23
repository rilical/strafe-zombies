// markers.test.js — TDD spec for buyableMarkers
// Tests cover: correct coords, id, kind, filtering, centroid, order, mutation safety.

import { describe, it, expect } from 'vitest';
import { buyableMarkers } from '../src/markers.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeLevel(overrides = {}) {
  return {
    mounts: [
      { id: 'mount-a', weaponId: 'mp40', cost: 1500, cx: 2, cy: 3, faceX: 1, faceY: 0 },
      { id: 'mount-b', weaponId: 'kar98', cost: 1500, cx: 5, cy: 7, faceX: 0, faceY: 1 },
    ],
    box: { cx: 10, cy: 4 },
    perkMachines: [
      { id: 'juggernog', perkId: 'juggernog', cost: 2500, cx: 1, cy: 1 },
      { id: 'speed-cola', perkId: 'speed-cola', cost: 3000, cx: 8, cy: 2 },
    ],
    debris: [
      { id: 'door-1', cost: 750, cells: [[4, 5], [4, 6]], opensRoom: 'room-b' },
      { id: 'door-2', cost: 1000, cells: [[0, 0], [1, 0], [2, 0]], opensRoom: 'room-c' },
    ],
    ...overrides,
  };
}

function makeWorld(overrides = {}) {
  return { doors: {}, windows: {}, ...overrides };
}

// ---------------------------------------------------------------------------
// Mounts
// ---------------------------------------------------------------------------

describe('mounts', () => {
  it('includes all mounts, always, with correct kind/id/coords', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const mounts = markers.filter(m => m.kind === 'mount');
    expect(mounts).toHaveLength(2);
    expect(mounts[0]).toEqual({ id: 'mount-a', kind: 'mount', x: 2.5, y: 3.5 });
    expect(mounts[1]).toEqual({ id: 'mount-b', kind: 'mount', x: 5.5, y: 7.5 });
  });

  it('returns no mount markers when level.mounts is empty', () => {
    const markers = buyableMarkers(makeLevel({ mounts: [] }), makeWorld(), {});
    expect(markers.filter(m => m.kind === 'mount')).toHaveLength(0);
  });

  it('tolerates missing level.mounts (undefined)', () => {
    const level = makeLevel();
    delete level.mounts;
    const markers = buyableMarkers(level, makeWorld(), {});
    expect(markers.filter(m => m.kind === 'mount')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Mystery Box
// ---------------------------------------------------------------------------

describe('mystery box', () => {
  it('always includes the box marker with correct id and centred coords', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const box = markers.find(m => m.kind === 'box');
    expect(box).toBeDefined();
    expect(box).toEqual({ id: 'box', kind: 'box', x: 10.5, y: 4.5 });
  });

  it('omits the box marker when level.box is missing', () => {
    const level = makeLevel();
    delete level.box;
    const markers = buyableMarkers(level, makeWorld(), {});
    expect(markers.filter(m => m.kind === 'box')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Perk machines
// ---------------------------------------------------------------------------

describe('perk machines', () => {
  it('shows all machines when player has no perks (undefined)', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), { perks: undefined });
    const perks = markers.filter(m => m.kind === 'perk');
    expect(perks).toHaveLength(2);
  });

  it('shows all machines when player object has no perks property', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const perks = markers.filter(m => m.kind === 'perk');
    expect(perks).toHaveLength(2);
  });

  it('hides a machine when player already owns that perk (Set)', () => {
    const player = { perks: new Set(['juggernog']) };
    const markers = buyableMarkers(makeLevel(), makeWorld(), player);
    const perks = markers.filter(m => m.kind === 'perk');
    expect(perks).toHaveLength(1);
    expect(perks[0].id).toBe('speed-cola');
  });

  it('hides a machine when player already owns that perk (Array)', () => {
    const player = { perks: ['juggernog'] };
    const markers = buyableMarkers(makeLevel(), makeWorld(), player);
    const perks = markers.filter(m => m.kind === 'perk');
    expect(perks).toHaveLength(1);
    expect(perks[0].id).toBe('speed-cola');
  });

  it('hides ALL machines when player owns all perks (Set)', () => {
    const player = { perks: new Set(['juggernog', 'speed-cola']) };
    const markers = buyableMarkers(makeLevel(), makeWorld(), player);
    expect(markers.filter(m => m.kind === 'perk')).toHaveLength(0);
  });

  it('shows machine with correct coords', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const perk = markers.find(m => m.id === 'speed-cola');
    expect(perk).toEqual({ id: 'speed-cola', kind: 'perk', x: 8.5, y: 2.5 });
  });

  it('tolerates missing level.perkMachines (undefined)', () => {
    const level = makeLevel();
    delete level.perkMachines;
    const markers = buyableMarkers(level, makeWorld(), {});
    expect(markers.filter(m => m.kind === 'perk')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Debris doors
// ---------------------------------------------------------------------------

describe('debris doors', () => {
  it('shows an unopened door', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const door = markers.find(m => m.id === 'door-1');
    expect(door).toBeDefined();
    expect(door.kind).toBe('door');
  });

  it('hides a door when world.doors[id] === true', () => {
    const world = makeWorld({ doors: { 'door-1': true } });
    const markers = buyableMarkers(makeLevel(), world, {});
    expect(markers.find(m => m.id === 'door-1')).toBeUndefined();
    // door-2 still visible
    expect(markers.find(m => m.id === 'door-2')).toBeDefined();
  });

  it('shows a door when world.doors[id] === false', () => {
    const world = makeWorld({ doors: { 'door-1': false } });
    const markers = buyableMarkers(makeLevel(), world, {});
    expect(markers.find(m => m.id === 'door-1')).toBeDefined();
  });

  it('shows a door when it has no entry in world.doors (undefined)', () => {
    const world = makeWorld({ doors: {} });
    const markers = buyableMarkers(makeLevel(), world, {});
    expect(markers.find(m => m.id === 'door-1')).toBeDefined();
  });

  it('places door marker at the centroid of its cells + 0.5', () => {
    // door-1 cells: [[4,5],[4,6]] -> meanX=4, meanY=5.5 -> x=4.5, y=6
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const door1 = markers.find(m => m.id === 'door-1');
    expect(door1).toEqual({ id: 'door-1', kind: 'door', x: 4.5, y: 6 });
  });

  it('places door marker at centroid for multi-cell doors + 0.5', () => {
    // door-2 cells: [[0,0],[1,0],[2,0]] -> meanX=1, meanY=0 -> x=1.5, y=0.5
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const door2 = markers.find(m => m.id === 'door-2');
    expect(door2).toEqual({ id: 'door-2', kind: 'door', x: 1.5, y: 0.5 });
  });

  it('tolerates missing level.debris (undefined)', () => {
    const level = makeLevel();
    delete level.debris;
    const markers = buyableMarkers(level, makeWorld(), {});
    expect(markers.filter(m => m.kind === 'door')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Output order
// ---------------------------------------------------------------------------

describe('output order', () => {
  it('returns mounts, then box, then perks, then doors (stable)', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const kinds = markers.map(m => m.kind);
    // expect: mount, mount, box, perk, perk, door, door
    expect(kinds).toEqual(['mount', 'mount', 'box', 'perk', 'perk', 'door', 'door']);
  });

  it('mounts are in level.mounts array order', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const mounts = markers.filter(m => m.kind === 'mount');
    expect(mounts.map(m => m.id)).toEqual(['mount-a', 'mount-b']);
  });

  it('perks are in level.perkMachines array order', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const perks = markers.filter(m => m.kind === 'perk');
    expect(perks.map(m => m.id)).toEqual(['juggernog', 'speed-cola']);
  });

  it('doors are in level.debris array order', () => {
    const markers = buyableMarkers(makeLevel(), makeWorld(), {});
    const doors = markers.filter(m => m.kind === 'door');
    expect(doors.map(m => m.id)).toEqual(['door-1', 'door-2']);
  });
});

// ---------------------------------------------------------------------------
// Mutation safety
// ---------------------------------------------------------------------------

describe('mutation safety', () => {
  it('does not mutate the level object', () => {
    const level = makeLevel();
    const original = JSON.stringify(level);
    buyableMarkers(level, makeWorld(), {});
    expect(JSON.stringify(level)).toBe(original);
  });

  it('does not mutate the world object', () => {
    const world = makeWorld({ doors: { 'door-1': false } });
    const original = JSON.stringify(world);
    buyableMarkers(makeLevel(), world, {});
    expect(JSON.stringify(world)).toBe(original);
  });

  it('does not mutate the player object', () => {
    const player = { perks: new Set(['juggernog']) };
    const sizeBefore = player.perks.size;
    buyableMarkers(makeLevel(), makeWorld(), player);
    expect(player.perks.size).toBe(sizeBefore);
  });
});
