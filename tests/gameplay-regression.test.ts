import "../src/game/index";
import { describe, expect, test } from "bun:test";
import { getFishMaxWeight, isFishPerfect } from "../src/game/fishing/fish-weights";
import { getTrainingFoodXp } from "../src/game/fishing/fish-training-food";
import { returnFishOrDrop } from "../src/game/fishing/fish-inventory";
import {
  awardTrainingXp,
  FishHungerLevel,
  TRAINING_LEVEL_XP,
  updateTrainingPortState,
} from "../src/game/world/tiles/training-port-tile";
import { FishTankPortTile } from "../src/game/world/tiles/fish-tank-port-tile";
import { TileFlags } from "../src/game/world/constants";
import { finishOvenCooking, getOvenElapsedLowMs, handleOvenItemPlace } from "../src/game/cooking/cooking-manager";
import { HOME_OVEN, OVEN_HEAT, SALT } from "../src/game/cooking/cooking-constants";
import type { Player } from "../src/game/player";
import type { World } from "../src/game/world/world";
import type { TileData } from "../src/game/world/types";

const hours = (count: number): number => count * 60 * 60 * 1000;

function fishInTraining(overrides: Record<string, unknown> = {}): NonNullable<TileData["trainingPort"]> {
  return {
    fishId: 3000,
    weight: 15,
    level: 1,
    exp: 0,
    status: FishHungerLevel.CONTENT,
    lastFed: Date.UTC(2026, 0, 1),
    hunger: FishHungerLevel.CONTENT,
    hungerAtLastFed: FishHungerLevel.CONTENT,
    isDead: false,
    isSick: false,
    ...overrides,
  };
}

describe("perfect fish and training food", () => {
  test("uses species-specific max weights rather than a universal 200lb limit", () => {
    expect(getFishMaxWeight(3000)).toBe(15);
    expect(getFishMaxWeight(5552)).toBe(120);
    expect(getFishMaxWeight(3458)).toBe(50);
    expect(getFishMaxWeight(5580)).toBe(190);
    expect(isFishPerfect(5552, 120)).toBe(true);
    expect(isFishPerfect(5552, 100)).toBe(false);
    expect(isFishPerfect(999999, 200)).toBe(false);
  });

  test("only allows species-specific fish food and correct XP per pound", () => {
    expect(getTrainingFoodXp(3000, 3026, 20)).toBe(50);
    expect(getTrainingFoodXp(3450, 3458, 20)).toBe(40);
    expect(getTrainingFoodXp(3000, 3458, 20)).toBe(0);
    expect(getTrainingFoodXp(3000, 3026, -1)).toBe(0);
  });
});

describe("training state", () => {
  test("decays hunger on the original last-fed clock and eventually starves", () => {
    const tp = fishInTraining();
    const start = tp.lastFed;
    updateTrainingPortState(tp, start + hours(4));
    expect(tp.hunger).toBe(FishHungerLevel.HUNGRY);
    expect(tp.lastFed).toBe(start);
    updateTrainingPortState(tp, start + hours(24));
    expect(tp.hunger).toBe(FishHungerLevel.STARVING);
    expect(tp.isDead).toBe(true);
    expect(tp.status).toBe(7);
  });

  test("persists multiple level gains and surplus XP", () => {
    const tp = fishInTraining();
    awardTrainingXp(tp, 500);
    expect(tp.level).toBe(4);
    expect(tp.exp).toBe(75);
  });

  test("requires level-ten XP completion and caps XP at the threshold", () => {
    const tp = fishInTraining({ level: 9, exp: TRAINING_LEVEL_XP[9] - 1 });
    awardTrainingXp(tp, 1);
    expect(tp.level).toBe(10);
    expect(tp.exp).toBe(0);
    awardTrainingXp(tp, 10_000);
    expect(tp.exp).toBe(TRAINING_LEVEL_XP[10]);
  });
});

describe("fish tank and inventory", () => {
  test("removes the enabled flag when perfect-fish glow is disabled", () => {
    const tile = Object.create(FishTankPortTile.prototype) as FishTankPortTile;
    tile.data = { fishTank: { fishes: [], glowing: false } } as TileData;
    expect(tile.serializedFlags(TileFlags.OPEN) & TileFlags.OPEN).toBe(0);
    tile.data.fishTank!.glowing = true;
    expect(tile.serializedFlags(0) & TileFlags.OPEN).toBe(TileFlags.OPEN);
  });

  test("drops the remainder when a fish doesn't fit in a backpack stack", () => {
    const dropped: Array<{ item: number; amount: number }> = [];
    const player = { addItemInven: (_id: number, amount: number) => Math.min(amount, 3) } as unknown as Player;
    const world = {
      drop: (_player: Player, _x: number, _y: number, item: number, amount: number) => {
        dropped.push({ item, amount });
      },
    } as unknown as World;

    returnFishOrDrop(player, world, 3000, 15, 4, 5);
    expect(dropped).toEqual([{ item: 3000, amount: 12 }]);
  });
});


describe("oven cooking", () => {
  test("scales cooking time by the selected heat", () => {
    const startedAt = 10_000;
    const oven = { tempLevel: OVEN_HEAT.HIGH, startedAt } as NonNullable<TileData["oven"]>;
    expect(getOvenElapsedLowMs(oven, startedAt + 5000)).toBe(15000);
  });

  test("accepts spices while an oven is cooking", async () => {
    const block = {
      fg: HOME_OVEN,
      x: 5,
      y: 6,
      oven: {
        tempLevel: OVEN_HEAT.LOW,
        startedAt: Date.now(),
        chefPlayerId: 1,
        chefNetId: 1,
        ingredients: [{ itemId: 4562, timeAddedMs: 0 }],
        spices: { salt: 0, pepper: 0, sugar: 0 },
        lastTickSec: 0,
      },
    } as TileData;
    const player = {
      inventory: { hasItem: () => true },
      removeItemInven: () => 1,
      sendTextBubble: () => {},
      netID: 1,
    } as unknown as Player;
    const world = {
      players: [],
      hasTilePermission: async () => true,
      sendItemEffect: () => {},
      playPositioned: () => {},
      markDirty: () => {},
      getTileAt: () => block,
      get data() { return { blocks: [] }; },
    } as unknown as World;
    expect(await handleOvenItemPlace(player, world, block, SALT)).toBe(true);
    expect(block.oven!.spices.salt).toBe(1);
  });

  test("finishes a correctly timed recipe instead of giving a failed dish", () => {
    const produced: number[] = [];
    const block = {
      fg: HOME_OVEN,
      x: 5,
      y: 6,
      oven: {
        tempLevel: OVEN_HEAT.LOW,
        startedAt: Date.now() - 60_000,
        chefPlayerId: 1,
        chefNetId: 1,
        ingredients: [
          { itemId: 4562, timeAddedMs: 0 },
          { itemId: 874, timeAddedMs: 0 },
          { itemId: 868, timeAddedMs: 26700 },
          { itemId: 196, timeAddedMs: 40000 },
        ],
        spices: { salt: 0, pepper: 0, sugar: 2 },
        lastTickSec: 0,
      },
    } as TileData;
    const player = {
      inventory: { clothes: { hand: 0 } },
      playMods: { has: () => false },
      quests: { role: () => ({ lvl: 10 }), addRoleXp: () => {} },
      addItemInven: (id: number, amount: number) => { for (let i = 0; i < amount; i++) produced.push(id); return amount; },
      addXp: () => {},
      sendTextBubble: () => {},
      variants: { sendOnConsoleMessage: () => {} },
    } as unknown as Player;
    const world = {
      players: [],
      markDirty: () => {},
      sendItemEffect: () => {},
      sendParticleEffect: () => {},
      playPositioned: () => {},
      drop: () => {},
    } as unknown as World;
    finishOvenCooking(player, world, block);
    expect(produced.includes(4596)).toBe(true); // Berry Crepes
    expect(block.oven).toBe(undefined);
  });
});
