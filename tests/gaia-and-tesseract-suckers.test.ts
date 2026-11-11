import "../src/game/index";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import type { ItemDefinition } from "grow-items";
import * as itemUtils from "../src/game/item/item-utils";
import { Player } from "../src/game/player";
import { ExtendBuffer } from "../src/utils/extend-buffer";
import { TextParser } from "../src/utils/text-parser";
import { dialogs } from "../src/game/network/dialog-handler";
import { ActionTypes, ITEM_ID, TileExtraTypes, TileFlags } from "../src/game/world/constants";
import { World } from "../src/game/world/world";
import type { TileData } from "../src/game/world/types";
import { MagplantTile } from "../src/game/world/tiles/magplant-tile";
import { UNSUPPORTED_EXTRA_TYPES } from "../src/game/world/tiles/default-extra-tile";
import { isPlaceableType } from "../src/game/world/tiles/index";
import { collectMagplantDrop, getSuckerCapacity, isSuckerBlock } from "../src/game/world/magplant";

const catalog = new Map<number, ItemDefinition>([
  [ITEM_ID.DIRT, { id: ITEM_ID.DIRT, name: "Dirt", type: ActionTypes.FOREGROUND, rarity: 1, breakHits: 3 } as any],
  [ITEM_ID.DIRT_SEED, { id: ITEM_ID.DIRT_SEED, name: "Dirt Seed", type: ActionTypes.SEED, rarity: 1, growTime: 30 } as any],
  [ITEM_ID.CAVE_BACKGROUND, { id: ITEM_ID.CAVE_BACKGROUND, name: "Cave Background", type: ActionTypes.BACKGROUND, rarity: 1, breakHits: 3 } as any],
  [ITEM_ID.GEMS, { id: ITEM_ID.GEMS, name: "Gems", type: ActionTypes.GEMS, rarity: 0 } as any],
  [ITEM_ID.WORLD_LOCK, { id: ITEM_ID.WORLD_LOCK, name: "World Lock", type: ActionTypes.LOCK, rarity: 100 } as any],
  [ITEM_ID.MAGPLANT, { id: ITEM_ID.MAGPLANT, name: "MAGPLANT 5000", type: ActionTypes.ITEM_SUCKER, rarity: 999 } as any],
  [ITEM_ID.MAGPLANT_REMOTE, { id: ITEM_ID.MAGPLANT_REMOTE, name: "MAGPLANT 5000 Remote", type: ActionTypes.CONSUMABLE, rarity: 999 } as any],
  [ITEM_ID.GAIA_BEACON, { id: ITEM_ID.GAIA_BEACON, name: "Gaia's Beacon", type: ActionTypes.ITEM_SUCKER, rarity: 999 } as any],
  [ITEM_ID.UNSTABLE_TESSERACT, { id: ITEM_ID.UNSTABLE_TESSERACT, name: "Unstable Tesseract", type: ActionTypes.ITEM_SUCKER, rarity: 999 } as any],
  [ITEM_ID.GAIA_HEART, { id: ITEM_ID.GAIA_HEART, name: "Heart of Gaia", type: ActionTypes.AUTO_ACTION_HARVEST, rarity: 999 } as any],
  [ITEM_ID.TESSERACT_MANIPULATOR, { id: ITEM_ID.TESSERACT_MANIPULATOR, name: "Tesseract Manipulator", type: ActionTypes.AUTO_ACTION_BREAK, rarity: 999 } as any],
  [ITEM_ID.TECHNO_ORGANIC_ENGINE, { id: ITEM_ID.TECHNO_ORGANIC_ENGINE, name: "Techno-Organic Engine", type: ActionTypes.AUTO_ACTION_HARVEST_SUCK, rarity: 999 } as any],
]);

function mockCatalog() {
  return spyOn(itemUtils, "getItem").mockImplementation((id: number) => catalog.get(id));
}

function makeWorld(ownerId = 42): World {
  const blocks: TileData[] = [];
  const tilesMap = new Map<string, TileData>();
  for (let y = 0; y < 60; y++) {
    for (let x = 0; x < 100; x++) {
      const b = { fg: 0, bg: 0, x, y, flags: 0 } as TileData;
      blocks.push(b);
      tilesMap.set(`${x},${y}`, b);
    }
  }
  const wl = tilesMap.get("10,10")!;
  wl.fg = ITEM_ID.WORLD_LOCK;
  wl.flags |= TileFlags.LOCKED;
  wl.worldLockData = { ownerPlayerId: ownerId, accessed: [], isOwnerOpen: false, bpm: 100 };

  const world = {
    name: "TESTAUTOMATION",
    players: [],
    data: { width: 100, height: 60, blocks, dropped: { uid: 0, items: [] } },
    getOwnerPlayerId: () => ownerId,
    isWorldAdmin: () => false,
    getTileAt: (x: number, y: number) => tilesMap.get(`${x},${y}`),
    hasTilePermission: async () => true,
    markDirty: () => {},
    broadcast: () => {},
    playPositioned: () => {},
    getTileOwnerName: async () => "owner",
    drop: World.prototype.drop,
  } as unknown as World;

  return world;
}

function makePlayer(playerId = 42, isOwner = true): Player {
  const inventoryItems = new Map<number, number>();
  const player = {
    id: String(playerId),
    playerId,
    netID: 1,
    isDeveloper: false,
    gems: 5000,
    inventory: {
      items: inventoryItems,
      getAmount: (id: number) => inventoryItems.get(id) ?? 0,
      hasItem: (id: number) => (inventoryItems.get(id) ?? 0) > 0,
      canAddItem: () => true,
    },
    variants: {
      sendOnDialogRequest: () => {},
      sendOnConsoleMessage: () => {},
      sendOnSetBux: () => {},
    },
    sendTextBubble: () => {},
    sendInventory: () => {},
    setGems: function (amt: number) { this.gems = amt; },
    addGems: function (amt: number) { this.gems += amt; },
    removeItemInven: (id: number, amt: number) => {
      const cur = inventoryItems.get(id) ?? 0;
      const rem = Math.min(cur, amt);
      inventoryItems.set(id, cur - rem);
      return rem;
    },
    addItemInven: (id: number, amt: number) => {
      const cur = inventoryItems.get(id) ?? 0;
      inventoryItems.set(id, cur + amt);
      return amt;
    },
  } as unknown as Player;
  return player;
}

describe("Gaia's Beacon & Unstable Tesseract", () => {
  let catSpy: ReturnType<typeof mockCatalog>;
  afterEach(() => { catSpy?.mockRestore(); });

  test("capacity is 1,500 for Gaia's Beacon and Unstable Tesseract, 5,000 for Magplant", () => {
    catSpy = mockCatalog();
    expect(getSuckerCapacity(ITEM_ID.GAIA_BEACON)).toBe(1500);
    expect(getSuckerCapacity(ITEM_ID.UNSTABLE_TESSERACT)).toBe(1500);
    expect(getSuckerCapacity(ITEM_ID.MAGPLANT)).toBe(5000);
    expect(isSuckerBlock(ITEM_ID.GAIA_BEACON)).toBe(true);
    expect(isSuckerBlock(ITEM_ID.UNSTABLE_TESSERACT)).toBe(true);
    expect(isSuckerBlock(ITEM_ID.MAGPLANT)).toBe(true);
  });

  test("Gaia's Beacon serializes TileExtra type 62 with capacity 1500", () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(5, 5)!;
    block.fg = ITEM_ID.GAIA_BEACON;
    const tile = new MagplantTile(world, block);
    tile.storage.itemId = ITEM_ID.DIRT_SEED;
    tile.storage.count = 500;
    tile.storage.collecting = true;
    tile.storage.planting = false;

    const buf = new ExtendBuffer(0);
    tile.serialize(buf);
    const data = Buffer.from(buf.data);
    expect(data[0]).toBe(TileExtraTypes.MAGPLANT); // 62
    expect(data.readUInt32LE(1)).toBe(ITEM_ID.DIRT_SEED);
    expect(data.readUInt32LE(5)).toBe(500);
    expect(data[9]).toBe(1); // collecting
    expect(data[10]).toBe(0); // planting
    expect(data.readUInt16LE(12)).toBe(1500); // capacity
  });

  test("Gaia's Beacon rejects non-seeds upon selection", async () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(5, 5)!;
    block.fg = ITEM_ID.GAIA_BEACON;
    const tile = new MagplantTile(world, block);

    const owner = makePlayer(42);
    owner.world = world;
    owner.inventory.items.set(ITEM_ID.DIRT, 100);

    let bubble = "";
    owner.sendTextBubble = (msg) => { bubble = msg; };

    const handler = dialogs.get("itemsucker_block")!;
    await handler(owner, new TextParser(`dialog_name|itemsucker_block\ntilex|5\ntiley|5\nselectitem|${ITEM_ID.DIRT}\n`));
    expect(bubble).toContain("You can only store seeds in this machine.");
    expect(tile.storage.itemId).toBe(0);
  });

  test("Gaia's Beacon accepts seeds upon selection", async () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(5, 5)!;
    block.fg = ITEM_ID.GAIA_BEACON;
    const tile = new MagplantTile(world, block);

    const owner = makePlayer(42);
    owner.world = world;
    owner.inventory.items.set(ITEM_ID.DIRT_SEED, 100);

    const handler = dialogs.get("itemsucker_block")!;
    await handler(owner, new TextParser(`dialog_name|itemsucker_block\ntilex|5\ntiley|5\nselectitem|${ITEM_ID.DIRT_SEED}\n`));
    expect(tile.storage.itemId).toBe(ITEM_ID.DIRT_SEED);
  });

  test("Unstable Tesseract rejects seeds upon selection and accepts blocks", async () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(5, 5)!;
    block.fg = ITEM_ID.UNSTABLE_TESSERACT;
    const tile = new MagplantTile(world, block);

    const owner = makePlayer(42);
    owner.world = world;
    owner.inventory.items.set(ITEM_ID.DIRT_SEED, 50);
    owner.inventory.items.set(ITEM_ID.DIRT, 50);

    let bubble = "";
    owner.sendTextBubble = (msg) => { bubble = msg; };

    const handler = dialogs.get("itemsucker_block")!;
    await handler(owner, new TextParser(`dialog_name|itemsucker_block\ntilex|5\ntiley|5\nselectitem|${ITEM_ID.DIRT_SEED}\n`));
    expect(bubble).toContain("You cannot store seeds in this machine.");
    expect(tile.storage.itemId).toBe(0);

    await handler(owner, new TextParser(`dialog_name|itemsucker_block\ntilex|5\ntiley|5\nselectitem|${ITEM_ID.DIRT}\n`));
    expect(tile.storage.itemId).toBe(ITEM_ID.DIRT);
  });

  test("collectMagplantDrop respects sucker specialization and 1,500 capacity", () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    // Machine 1: Gaia's Beacon configured for Dirt Seed
    const b1 = world.getTileAt(2, 2)!;
    b1.fg = ITEM_ID.GAIA_BEACON;
    b1.magplant = { instanceId: "g1", itemId: ITEM_ID.DIRT_SEED, count: 1400, collecting: true };

    // Machine 2: Unstable Tesseract configured for Dirt
    const b2 = world.getTileAt(3, 3)!;
    b2.fg = ITEM_ID.UNSTABLE_TESSERACT;
    b2.magplant = { instanceId: "u1", itemId: ITEM_ID.DIRT, count: 1400, collecting: true };

    // Drop 150 seeds: 100 should be collected (capping at 1500), 50 remaining
    const seedsLeft = collectMagplantDrop(world, ITEM_ID.DIRT_SEED, 150, { x: 64, y: 64 });
    expect(seedsLeft).toBe(50);
    expect(b1.magplant.count).toBe(1500);

    // Drop 150 blocks: 100 should be collected (capping at 1500), 50 remaining
    const blocksLeft = collectMagplantDrop(world, ITEM_ID.DIRT, 150, { x: 64, y: 64 });
    expect(blocksLeft).toBe(50);
    expect(b2.magplant.count).toBe(1500);
  });

  test("Gaia's Beacon & Unstable Tesseract wrench dialog omits remote and building mode UI", async () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(10, 10)!;
    block.fg = ITEM_ID.GAIA_BEACON;
    const tile = new MagplantTile(world, block);
    tile.storage.itemId = ITEM_ID.DIRT_SEED;

    const owner = makePlayer(42);
    owner.world = world;
    let sentDialog = "";
    owner.variants.sendOnDialogRequest = (d) => { sentDialog = d; };

    await tile.onWrench(owner);
    expect(sentDialog).not.toContain("Building mode");
    expect(sentDialog).not.toContain("getplantationdevice");
    expect(sentDialog).not.toContain("Remote");
    expect(sentDialog).toContain("itemsucker_seed");

    // Magplant omits Building mode active/inactive from dialog
    block.fg = ITEM_ID.MAGPLANT;
    tile.storage.planting = false;
    await tile.onWrench(owner);
    expect(sentDialog).not.toContain("Building mode");

    tile.storage.planting = true;
    await tile.onWrench(owner);
    expect(sentDialog).not.toContain("Building mode");
    expect(sentDialog).toContain("getplantationdevice");
  });

  test("Gaia's Beacon punch toggles collecting and disables suction when off", async () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(11, 11)!;
    block.fg = ITEM_ID.GAIA_BEACON;
    const tile = new MagplantTile(world, block);
    tile.storage.itemId = ITEM_ID.DIRT_SEED;
    tile.storage.collecting = true;

    const owner = makePlayer(42);
    owner.world = world;

    // Punch toggles collecting off
    await tile.onPunch(owner);
    expect(tile.storage.collecting).toBe(false);

    // Drop seeds: because collecting is false, it cannot suck
    const left1 = collectMagplantDrop(world, ITEM_ID.DIRT_SEED, 50, { x: 32, y: 32 });
    expect(left1).toBe(50);
    expect(tile.storage.count).toBe(0);

    // Punch again toggles collecting back on
    block.resetStateAt = 0;
    await tile.onPunch(owner);
    expect(tile.storage.collecting).toBe(true);

    const left2 = collectMagplantDrop(world, ITEM_ID.DIRT_SEED, 50, { x: 32, y: 32 });
    expect(left2).toBe(0);
    expect(tile.storage.count).toBe(50);
  });
});

describe("Heart of Gaia, Tesseract Manipulator & Techno-Organic Engine (Unimplemented)", () => {
  test("ActionTypes are marked in UNSUPPORTED_EXTRA_TYPES and not placeable", () => {
    expect(UNSUPPORTED_EXTRA_TYPES.has(ActionTypes.AUTO_ACTION_BREAK)).toBe(true);
    expect(UNSUPPORTED_EXTRA_TYPES.has(ActionTypes.AUTO_ACTION_HARVEST)).toBe(true);
    expect(UNSUPPORTED_EXTRA_TYPES.has(ActionTypes.AUTO_ACTION_HARVEST_SUCK)).toBe(true);

    expect(isPlaceableType(ActionTypes.AUTO_ACTION_BREAK)).toBe(false);
    expect(isPlaceableType(ActionTypes.AUTO_ACTION_HARVEST)).toBe(false);
    expect(isPlaceableType(ActionTypes.AUTO_ACTION_HARVEST_SUCK)).toBe(false);
  });
});
