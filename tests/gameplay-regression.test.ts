import "../src/game/index";
import { describe, expect, spyOn, test } from "bun:test";
import { getFishMaxWeight, isFishPerfect } from "../src/game/fishing/fish-weights";
import { getTrainingFoodXp } from "../src/game/fishing/fish-training-food";
import { returnFishOrDrop } from "../src/game/fishing/fish-inventory";
import {
  awardTrainingXp,
  FishHungerLevel,
  TRAINING_LEVEL_XP,
  updateTrainingPortState,
  tickFishTraining,
  TrainingPortTile,
} from "../src/game/world/tiles/training-port-tile";
import { FishTankPortTile } from "../src/game/world/tiles/fish-tank-port-tile";
import { TileFlags } from "../src/game/world/constants";
import { finishOvenCooking, getOvenElapsedLowMs, handleOvenItemPlace } from "../src/game/cooking/cooking-manager";
import { HOME_OVEN, OVEN_HEAT, SALT } from "../src/game/cooking/cooking-constants";
import type { Player } from "../src/game/player";
import { World } from "../src/game/world/world";
import type { Variant } from "../src/game/packets/variants";
import type { TileData } from "../src/game/world/types";
import { dialogs } from "../src/game/network/dialog-handler";
import { TextParser } from "../src/utils/text-parser";
import { ExtendBuffer } from "../src/utils/extend-buffer";
import { OvenTile } from "../src/game/world/tiles/oven-tile";
import { tintSkinColor } from "../src/game/player/play-mods";
import { PlayModController } from "../src/game/player/play-mod-controller";
import { GameMessageMap } from "../src/game/network/game-message-handler";
import { normalizeChatInput } from "../src/utils/chat-input";
import { commands, executeCommand } from "../src/game/commands/registry";
import { PLAYER_ROLE } from "../src/constants";
import { decodeTextPacket } from "../src/utils/text-packet";
import { searchItemNames } from "../src/game/item/item-search";
import type { ItemDefinition } from "grow-items";

const hours = (count: number): number => count * 60 * 60 * 1000;

describe("command input boundaries", () => {
  test.each([Buffer.from([0x03, 0x71]), Buffer.from([0xff, 0x71]), Buffer.from([0, 0x71])])("stops at a corrupt suffix before it joins printable junk to the query", (suffix) => {
    const packet = Buffer.concat([Buffer.from([2, 0, 0, 0]), Buffer.from("action|input\ntext|/find Café Egg"), suffix]);
    expect(new TextParser(decodeTextPacket(packet)).get("text")).toBe("/find Café Egg");
  });

  test("uses a bounded trailing-character fallback only when the literal query has no matches", () => {
    const definitions = [{ id: 2, name: "Dirt" }, { id: 4, name: "DirtX" }, { id: 3, name: "Dirt Seed" }] as ItemDefinition[];
    expect(searchItemNames(definitions, "DirtX").corrected).toBe(false);
    expect(searchItemNames(definitions, "DirtX").matches.map((item) => item.id)).toEqual([4]);
    const recovered = searchItemNames(definitions, "DirtQ");
    expect(recovered.corrected).toBe(true);
    expect(recovered.query).toBe("dirt");
    expect(recovered.matches.map((item) => item.id)).toEqual([2, 4]);
    expect(searchItemNames(definitions, "DirtQQ").matches).toHaveLength(0);
    expect(searchItemNames(definitions, "DirtQ", true).matches.map((item) => item.id)).toEqual([3]);
  });
  test.each(["\0junk", "\r\njunk", "\njunk", "\u007f\u0081\u200b\ufeff", "`o"])("cleans the suffix %j from find arguments", async (suffix) => {
    const original = commands.get("find")!;
    let received: string[] = [];
    commands.set("find", { ...original, cooldown: 0, execute: (_player, args) => { received = args; } });
    try {
      const player = { id: `parser-${suffix}`, role: PLAYER_ROLE.DEVELOPER } as Player;
      await executeCommand(player, `find Master Chef's Oven${suffix}`);
      expect(received).toEqual(["Master", "Chef's", "Oven"]);
    } finally {
      commands.set("find", original);
    }
  });

  test("preserves meaningful punctuation and Unicode", () => {
    expect(normalizeChatInput("find Café's Hat + Wings! (Blue) 2")).toBe("find Café's Hat + Wings! (Blue) 2");
  });

  test("does not parse fields or printable junk beyond a null terminator", () => {
    const text = new TextParser("action|input\ntext|/find Egg\0x\ntext|/find wrong");
    expect(text.get("text")).toBe("/find Egg");
    expect(text.getEntries()).toHaveLength(2);
  });
});

describe("consumable skin colors and discovery navigation", () => {
  test("packs effect colors in client BGRA order and restores the original skin", () => {
    const base = 0x8295c3ff;
    let displayed = base;
    let controller: PlayModController;
    const player = {
      netID: 1, sendCharacterState: () => {}, sendSfx: () => {},
      variants: { sendOnConsoleMessage: () => {} },
      sendClothesToWorld: () => { displayed = tintSkinColor(base, controller.stats.skinTint); },
    } as unknown as Player;
    controller = new PlayModController(player);
    controller.add("feelin_blue");
    expect(displayed).toBe(0xff0000ff);
    controller.remove("feelin_blue");
    expect(displayed).toBe(base);
    controller.add("saucy");
    expect(displayed).toBe(0x2828ffff);
    controller.remove("saucy");
    expect(displayed).toBe(base);
  });

  test("the discovery Home action joins the saved world instead of client-supplied input", async () => {
    const joined: string[] = [];
    const player = { homeWorld: "MYHOME", enterWorld: async (name: string) => { joined.push(name); } } as unknown as Player;
    await GameMessageMap.gohomeworld!(player, new TextParser("name|OTHERWORLD"));
    expect(joined).toEqual(["MYHOME"]);
  });

  test("the discovery Home action handles accounts without a home", async () => {
    let failed = false;
    const player = { homeWorld: null, variants: {
      sendOnFailedToEnterWorld: () => { failed = true; }, sendOnConsoleMessage: () => {},
    } } as unknown as Player;
    await GameMessageMap.gohomeworld!(player, new TextParser());
    expect(failed).toBe(true);
  });
});

describe("mechanics dialog returns", () => {
  test.each([true, false])("graduation consumes the fish and awards one reward (backpack space: %s)", async (hasSpace) => {
    const tp = fishInTraining({ level: 10, exp: TRAINING_LEVEL_XP[10], lastFed: Date.now() });
    const block = { x: 7, y: 9, fg: 5530, trainingPort: tp } as TileData;
    const awarded: number[] = [];
    const dropped: number[] = [];
    const world = {
      getTileAt: () => block, hasTilePermission: async () => true,
      markDirty: () => {}, players: [],
      drop: (_player: Player, _x: number, _y: number, id: number) => { dropped.push(id); },
    } as unknown as World;
    const player = {
      world, addItemInven: (id: number) => { awarded.push(id); return hasSpace ? 1 : 0; },
      sendInventory: () => {}, sendSfx: () => {}, sendTextBubble: () => {},
      variants: { sendOnConsoleMessage: () => {} },
    } as unknown as Player;
    const action = new TextParser("tilex|7\ntiley|9\nbuttonClicked|train_claim_reward");
    await dialogs.get("training_port_dialog")!(player, action);
    expect(awarded.length).toBe(1);
    expect([5586, 5604]).toContain(awarded[0]);
    expect(dropped).toEqual(hasSpace ? [] : awarded);
    expect(tp.fishId).toBe(0);
    expect(tp.weight).toBe(0);
    await dialogs.get("training_port_dialog")!(player, action);
    expect(awarded.length).toBe(1);
  });

  test("starts an oven at the submitted coordinates after selecting heat", async () => {
    const block = { x: 7, y: 9, fg: HOME_OVEN } as TileData;
    const world = {
      getTileAt: (x: number, y: number) => x === 7 && y === 9 ? block : undefined,
      hasTilePermission: async () => true,
      sendItemEffectToTile: () => {}, playPositioned: () => {}, markDirty: () => {},
      players: [],
    } as unknown as World;
    const player = {
      world, playerId: 1, netID: 1,
      inventory: { hasItem: () => true }, removeItemInven: () => 1,
      sendTextBubble: () => {},
    } as unknown as Player;
    await dialogs.get("homeoven_edit")!(player, new TextParser(
      "tilex|7\ntiley|9\ncookthis|4602\nbuttonClicked|high",
    ));
    expect(block.oven?.tempLevel).toBe(OVEN_HEAT.HIGH);
    expect(block.oven?.ingredients).toEqual([{ itemId: 4602, timeAddedMs: 0 }]);
  });

  test("handles a training picker selection without a Feed button", async () => {
    const tp = fishInTraining({ lastFed: Date.now() });
    const block = { x: 7, y: 9, fg: 5530, trainingPort: tp } as TileData;
    let consumed = 0;
    const world = {
      getTileAt: () => block, hasTilePermission: async () => true,
      markDirty: () => {}, players: [],
    } as unknown as World;
    const player = {
      world, inventory: { getAmount: () => 10 },
      removeItemInven: (_id: number, count: number) => { consumed += count; return count; },
      sendInventory: () => {}, sendSfx: () => {}, sendTextBubble: () => {},
      variants: { sendOnConsoleMessage: () => {} },
    } as unknown as Player;
    await dialogs.get("training_port_dialog")!(player, new TextParser(
      "tilex|7\ntiley|9\nfeed_item|3468",
    ));
    expect(consumed).toBe(10);
    expect(tp.exp).toBe(10);
    expect(tp.isSick).toBe(true);
    expect(tp.hunger).toBe(FishHungerLevel.SUPER_FULL);
  });
});

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
  test.each([
    [FishHungerLevel.CONTENT, false, false, 0, 0, 0],
    [FishHungerLevel.SUPER_FULL, false, false, 0, 0, 0],
    [FishHungerLevel.HUNGRY, false, false, 0, 0, 1],
    [FishHungerLevel.SUPER_FULL, true, false, 1, 0, 0],
    [FishHungerLevel.STARVING, false, true, 0, 1, 1],
  ])("encodes fish health independently of fullness %i", (hunger, isSick, isDead, sickByte, deadByte, hungry) => {
    const tile = Object.create(TrainingPortTile.prototype) as TrainingPortTile;
    tile.data = { trainingPort: fishInTraining({ hunger, hungerAtLastFed: hunger, isSick, isDead, lastFed: Date.now() }) } as TileData;
    const buffer = new ExtendBuffer(0);
    tile.serialize(buffer);
    expect(buffer.data[5]).toBe(sickByte);
    expect(buffer.data[6]).toBe(deadByte);
    buffer.mempos = 19;
    expect(buffer.readU32()).toBe(hungry);
  });
  test("encodes the client glow bit in the tank extra flags", () => {
    const tile = Object.create(FishTankPortTile.prototype) as FishTankPortTile;
    tile.data = { fishTank: { fishes: [{ id: 3000, weight: 15 }], glowing: true } } as TileData;
    const enabled = new ExtendBuffer(0);
    tile.serialize(enabled);
    expect(enabled.data[1]).toBe(0x10);
    tile.data.fishTank!.glowing = false;
    const disabled = new ExtendBuffer(0);
    tile.serialize(disabled);
    expect(disabled.data[1]).toBe(0);
    expect(disabled.data.slice(2)).toEqual(enabled.data.slice(2));
  });

  test("encodes training completion separately from fish health", () => {
    const tile = Object.create(TrainingPortTile.prototype) as TrainingPortTile;
    tile.data = { trainingPort: fishInTraining({ lastFed: Date.now(), isSick: true }) } as TileData;
    const sick = new ExtendBuffer(0);
    tile.serialize(sick);
    expect(sick.data.length).toBe(36);
    expect(sick.data[5]).toBe(1);
    expect(sick.data[6]).toBe(0);
    tile.data.trainingPort!.level = 10;
    tile.data.trainingPort!.exp = TRAINING_LEVEL_XP[10]!;
    const complete = new ExtendBuffer(0);
    tile.serialize(complete);
    expect(complete.data[6]).toBe(0);
    expect(complete.data[35]).toBe(1);
    expect(tile.serializedFlags(TileFlags.OPEN) & TileFlags.OPEN).toBe(TileFlags.OPEN);
    tile.data.trainingPort!.fishId = 0;
    expect(tile.serializedFlags(TileFlags.OPEN) & TileFlags.OPEN).toBe(0);
  });

  test("broadcasts hunger changes on the world tick without opening a dialog", () => {
    const tp = fishInTraining();
    let updates = 0;
    let saves = 0;
    const block = { fg: 5530, trainingPort: tp } as TileData;
    const world = {
      players: [{ send: () => { updates++; } }], data: { blocks: [block] },
      markDirty: () => { saves++; },
    } as unknown as World;
    const update = spyOn(TrainingPortTile.prototype, "tileUpdate").mockImplementation(() => { updates++; });
    try {
      tickFishTraining(world, tp.lastFed + hours(4));
      expect(tp.status).toBe(FishHungerLevel.HUNGRY);
      expect(updates).toBe(1);
      expect(saves).toBe(1);
    } finally {
      update.mockRestore();
    }
  });

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
  test.each([
    [OVEN_HEAT.OFF, [0x00, 0x00, 0x00, 0x00]],
    [OVEN_HEAT.LOW, [0x03, 0x00, 0x00, 0x00]],
    [OVEN_HEAT.MED, [0x06, 0x00, 0x00, 0x00]],
    [OVEN_HEAT.HIGH, [0x09, 0x00, 0x00, 0x00]],
  ])("encodes heat %i using the client tooltip integer rates", (heat, bytes) => {
    const tile = Object.create(OvenTile.prototype) as OvenTile;
    tile.data = { oven: { tempLevel: heat, startedAt: Date.now(), ingredients: [] } } as TileData;
    const buffer = new ExtendBuffer(0);
    tile.serialize(buffer);
    expect(buffer.data.slice(1, 5)).toEqual(bytes);
    buffer.mempos = 1;
    expect(buffer.readU32()).toBe(heat * 3);
    expect(buffer.readU32()).toBe(0);
  });
  test("sends the ingredient animation from the avatar to the oven center", () => {
    let sent: Variant | undefined;
    const world = { broadcastVariant: (variant: Variant) => { sent = variant; } } as unknown as World;
    World.prototype.sendItemEffectToTile.call(world, 4562, { netID: 12 } as Player, { x: 5, y: 6 } as TileData);
    expect(sent?.args).toEqual(["OnItemEffect", 4, { int: 4562 }, { int: 1 }, [0, 0], [176, 208], { int: 12 }]);
  });
  test("serializes received heat and the Unix start time for client oven status", () => {
    const tile = Object.create(OvenTile.prototype) as OvenTile;
    const startedAt = Date.now() - 40_000;
    tile.data = { oven: {
      tempLevel: OVEN_HEAT.LOW, startedAt,
      ingredients: [{ itemId: 4562, timeAddedMs: 0 }, { itemId: 874, timeAddedMs: 15_000 }],
    } } as TileData;
    const buffer = new ExtendBuffer(0);
    tile.serialize(buffer);
    buffer.mempos = 1;
    expect(buffer.readU32()).toBe(3);
    expect(buffer.readU32()).toBe(4);
    expect(buffer.readU32()).toBe(4562);
    expect(buffer.readU32()).toBe(120);
    expect(buffer.readU32()).toBe(874);
    expect(buffer.readU32()).toBe(75);
    expect(buffer.readU32()).toBe(0);
    expect(buffer.readU32()).toBe(Math.floor(startedAt / 1000));
    expect(buffer.readU32()).toBe(0);
  });
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
      sendItemEffectToTile: () => {},
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
      sendItemEffectToTile: () => {},
      sendParticleEffect: () => {},
      sendItemEffect: () => {},
      playPositioned: () => {},
      drop: () => {},
    } as unknown as World;
    finishOvenCooking(player, world, block);
    expect(produced.includes(4596)).toBe(true); // Berry Crepes
    expect(block.oven).toBe(undefined);
  });
});
