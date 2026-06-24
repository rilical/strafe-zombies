import { describe, it, expect } from 'vitest';
import { createLoadout, equip, swap, activeWeapon } from '../src/loadout.js';

describe('createLoadout', () => {
  it('returns the correct initial shape', () => {
    const l = createLoadout('pistol');
    expect(l).toEqual({ slots: ['pistol', null], active: 0 });
  });
});

describe('equip', () => {
  it('fills the empty 2nd slot, makes it active, replaced is null', () => {
    const l = createLoadout('pistol');
    const { loadout, replaced } = equip(l, 'rifle');
    expect(loadout.slots).toEqual(['pistol', 'rifle']);
    expect(loadout.active).toBe(1);
    expect(replaced).toBeNull();
  });

  it('overwrites the active slot when both slots are full, returns displaced id', () => {
    const l = { slots: ['pistol', 'rifle'], active: 0 };
    const { loadout, replaced } = equip(l, 'shotgun');
    expect(loadout.slots).toEqual(['shotgun', 'rifle']);
    expect(loadout.active).toBe(0);
    expect(replaced).toBe('pistol');
  });

  it('overwrites the active slot (slot 1) when both full and active is 1', () => {
    const l = { slots: ['pistol', 'rifle'], active: 1 };
    const { loadout, replaced } = equip(l, 'shotgun');
    expect(loadout.slots).toEqual(['pistol', 'shotgun']);
    expect(loadout.active).toBe(1);
    expect(replaced).toBe('rifle');
  });

  it('re-equipping an already-held weapon just switches active, no duplicate, replaced null', () => {
    const l = { slots: ['pistol', 'rifle'], active: 0 };
    const { loadout, replaced } = equip(l, 'rifle');
    expect(loadout.slots).toEqual(['pistol', 'rifle']);
    expect(loadout.active).toBe(1);
    expect(replaced).toBeNull();
  });

  it('re-equipping the current active weapon keeps it active, no duplicate, replaced null', () => {
    const l = { slots: ['pistol', 'rifle'], active: 0 };
    const { loadout, replaced } = equip(l, 'pistol');
    expect(loadout.slots).toEqual(['pistol', 'rifle']);
    expect(loadout.active).toBe(0);
    expect(replaced).toBeNull();
  });

  it('does not mutate the input loadout', () => {
    const l = createLoadout('pistol');
    const slotsBefore = [...l.slots];
    const activeBefore = l.active;
    equip(l, 'rifle');
    expect(l.slots).toEqual(slotsBefore);
    expect(l.active).toBe(activeBefore);
  });

  it('does not mutate input when both slots full', () => {
    const l = { slots: ['pistol', 'rifle'], active: 0 };
    const slotsBefore = [...l.slots];
    equip(l, 'shotgun');
    expect(l.slots).toEqual(slotsBefore);
    expect(l.active).toBe(0);
  });
});

describe('swap', () => {
  it('toggles active 0->1 when both slots are non-null', () => {
    const l = { slots: ['pistol', 'rifle'], active: 0 };
    const result = swap(l);
    expect(result.active).toBe(1);
    expect(result.slots).toEqual(['pistol', 'rifle']);
  });

  it('toggles active 1->0 when both slots are non-null', () => {
    const l = { slots: ['pistol', 'rifle'], active: 1 };
    const result = swap(l);
    expect(result.active).toBe(0);
  });

  it('is a no-op when the other slot is null (active stays)', () => {
    const l = { slots: ['pistol', null], active: 0 };
    const result = swap(l);
    expect(result.active).toBe(0);
    expect(result.slots).toEqual(['pistol', null]);
  });

  it('does not mutate the input', () => {
    const l = { slots: ['pistol', 'rifle'], active: 0 };
    swap(l);
    expect(l.active).toBe(0);
  });
});

describe('activeWeapon', () => {
  it('returns the weapon in the active slot', () => {
    const l = { slots: ['pistol', 'rifle'], active: 1 };
    expect(activeWeapon(l)).toBe('rifle');
  });

  it('returns null when active slot is empty', () => {
    const l = createLoadout('pistol');
    // Manually construct a loadout with null active slot
    const empty = { slots: [null, null], active: 0 };
    expect(activeWeapon(empty)).toBeNull();
  });
});
