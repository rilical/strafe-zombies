import { describe, expect, it } from "vitest";
import { BOX_COST, INTERACT_RADIUS, findInteractable } from "../src/interact.js";

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

function levelFixture(overrides = {}) {
  return {
    mounts: [
      { id: "kar-wall", weaponId: "kar98k", cost: 200, cx: 1, cy: 1, faceX: 1, faceY: 0 },
      { id: "tommy-wall", weaponId: "thompson", cost: 1200, cx: 6, cy: 1, faceX: -1, faceY: 0 },
    ],
    box: { cx: 3, cy: 1 },
    perkMachines: [
      { id: "jug-machine", perkId: "juggernog", cost: 2500, cx: 5, cy: 1 },
      { id: "speed-machine", perkId: "speed-cola", cost: 3000, cx: 7, cy: 1 },
    ],
    debris: [
      { id: "lobby-door", cost: 1000, cells: [[9, 1]], opensRoom: "lobby" },
      { id: "stair-door", cost: 1000, cells: [[11, 1], [12, 1]], opensRoom: "stairs" },
    ],
    ...overrides,
  };
}

describe("interact constants", () => {
  it("exports the frozen contract values", () => {
    expect(BOX_COST).toBe(950);
    expect(INTERACT_RADIUS).toBe(1.6);
  });
});

describe("findInteractable — proximity and candidate shape", () => {
  it("returns null when every buyable is outside the interact radius", () => {
    const player = { x: 20, y: 20 };

    expect(findInteractable(levelFixture(), { doors: {} }, player)).toBeNull();
  });

  it("returns a nearby wall mount with weapon id, cost, cell, and centre distance", () => {
    const player = { x: 1.5, y: 2.5 };

    expect(findInteractable(levelFixture(), { doors: {} }, player)).toEqual({
      kind: "mount",
      id: "kar-wall",
      cost: 200,
      weaponId: "kar98k",
      cx: 1,
      cy: 1,
      dist: 1,
    });
  });

  it("returns the nearer buyable before applying tie-breaks", () => {
    const level = levelFixture({
      mounts: [{ id: "far-wall", weaponId: "kar98k", cost: 200, cx: 1, cy: 1 }],
      box: { cx: 2, cy: 1 },
      perkMachines: [],
      debris: [],
    });
    const player = { x: 2.5, y: 2.4 };

    expect(findInteractable(level, undefined, player)).toEqual({
      kind: "box",
      id: "box",
      cost: BOX_COST,
      cx: 2,
      cy: 1,
      dist: 0.8999999999999999,
    });
  });

  it("breaks equal-distance ties by category order and then id", () => {
    const equalCategoryLevel = levelFixture({
      mounts: [{ id: "z-wall", weaponId: "kar98k", cost: 200, cx: 2, cy: 1 }],
      box: { cx: 2, cy: 1 },
      perkMachines: [{ id: "jug-machine", perkId: "juggernog", cost: 2500, cx: 2, cy: 1 }],
      debris: [{ id: "lobby-door", cost: 1000, cells: [[2, 1]], opensRoom: "lobby" }],
    });
    const equalIdLevel = levelFixture({
      mounts: [
        { id: "z-wall", weaponId: "kar98k", cost: 200, cx: 2, cy: 1 },
        { id: "a-wall", weaponId: "carbine", cost: 600, cx: 2, cy: 1 },
      ],
      box: undefined,
      perkMachines: [],
      debris: [],
    });
    const player = { x: 2.5, y: 2.5 };

    expect(findInteractable(equalCategoryLevel, { doors: {} }, player).id).toBe("z-wall");
    expect(findInteractable(equalIdLevel, { doors: {} }, player)).toMatchObject({
      kind: "mount",
      id: "a-wall",
      weaponId: "carbine",
    });
  });
});

describe("findInteractable — availability filters", () => {
  it("returns closed debris in range and skips it once the door is open", () => {
    const level = levelFixture({
      mounts: [],
      box: undefined,
      perkMachines: [],
      debris: [{ id: "lobby-door", cost: 1000, cells: [[2, 2]], opensRoom: "lobby" }],
    });
    const player = { x: 2.5, y: 2.5 };

    expect(findInteractable(level, { doors: { "lobby-door": false } }, player)).toEqual({
      kind: "debris",
      id: "lobby-door",
      cost: 1000,
      opensRoom: "lobby",
      cx: 2,
      cy: 2,
      dist: 0,
    });
    expect(findInteractable(level, { doors: { "lobby-door": true } }, player)).toBeNull();
  });

  it("returns unowned perk machines and skips perks the player already owns", () => {
    const level = levelFixture({
      mounts: [],
      box: undefined,
      perkMachines: [{ id: "jug-machine", perkId: "juggernog", cost: 2500, cx: 2, cy: 2 }],
      debris: [],
    });
    const player = { x: 2.5, y: 2.5 };

    expect(findInteractable(level, { doors: {} }, player)).toEqual({
      kind: "perk",
      id: "jug-machine",
      cost: 2500,
      perkId: "juggernog",
      cx: 2,
      cy: 2,
      dist: 0,
    });
    expect(findInteractable(level, { doors: {} }, { ...player, perks: new Set(["juggernog"]) }))
      .toBeNull();
  });
});

describe("findInteractable — defensive and immutable behavior", () => {
  it("uses the nearest debris cell and includes candidates exactly on the radius boundary", () => {
    const level = levelFixture({
      mounts: [],
      box: undefined,
      perkMachines: [],
      debris: [
        {
          id: "stair-door",
          cost: 1000,
          cells: [[0, 2], [2, 2], [5, 5]],
          opensRoom: "stairs",
        },
      ],
    });
    const player = { x: 0.9, y: 2.5 };

    expect(findInteractable(level, { doors: {} }, player)).toEqual({
      kind: "debris",
      id: "stair-door",
      cost: 1000,
      opensRoom: "stairs",
      cx: 2,
      cy: 2,
      dist: INTERACT_RADIUS,
    });
  });

  it("does not throw when optional level sections, world doors, or player perks are absent", () => {
    const player = { x: 2.5, y: 2.5 };

    expect(findInteractable({}, {}, player)).toBeNull();
    expect(findInteractable({ perkMachines: [{ id: "speed", perkId: "speed-cola", cost: 3000, cx: 2, cy: 2 }] }, undefined, player))
      .toEqual({
        kind: "perk",
        id: "speed",
        cost: 3000,
        perkId: "speed-cola",
        cx: 2,
        cy: 2,
        dist: 0,
      });
  });

  it("never mutates the level, world, or player inputs", () => {
    const level = deepFreeze(levelFixture({
      debris: [{ id: "lobby-door", cost: 1000, cells: [[2, 2]], opensRoom: "lobby" }],
    }));
    const world = deepFreeze({ doors: { "lobby-door": false } });
    const player = deepFreeze({ x: 1.5, y: 2.5, perks: new Set(["speed-cola"]) });

    findInteractable(level, world, player);

    expect(level).toEqual(levelFixture({
      debris: [{ id: "lobby-door", cost: 1000, cells: [[2, 2]], opensRoom: "lobby" }],
    }));
    expect(world).toEqual({ doors: { "lobby-door": false } });
    expect(player.x).toBe(1.5);
    expect(player.y).toBe(2.5);
    expect([...player.perks]).toEqual(["speed-cola"]);
  });
});
