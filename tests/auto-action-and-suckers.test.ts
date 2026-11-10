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
import { AutoActionTile, isAutoActionBlock, MAX_AUTO_ACTION_FUEL, tickAutoActionMachines, validateAutoActionTarget } from "../src/game/world/tiles/auto-action-tile";
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
});

describe("Heart of Gaia, Tesseract Manipulator & Techno-Organic Engine", () => {
  let catSpy: ReturnType<typeof mockCatalog>;
  afterEach(() => { catSpy?.mockRestore(); });

  test("target validation restricts item types correctly", () => {
    catSpy = mockCatalog();
    // Heart of Gaia: seeds only
    expect(validateAutoActionTarget(ITEM_ID.GAIA_HEART, ITEM_ID.DIRT_SEED).ok).toBe(true);
    expect(validateAutoActionTarget(ITEM_ID.GAIA_HEART, ITEM_ID.DIRT).ok).toBe(false);

    // Tesseract Manipulator: blocks only
    expect(validateAutoActionTarget(ITEM_ID.TESSERACT_MANIPULATOR, ITEM_ID.DIRT).ok).toBe(true);
    expect(validateAutoActionTarget(ITEM_ID.TESSERACT_MANIPULATOR, ITEM_ID.CAVE_BACKGROUND).ok).toBe(true);

    // Techno-Organic Engine: both blocks and seeds
    expect(validateAutoActionTarget(ITEM_ID.TECHNO_ORGANIC_ENGINE, ITEM_ID.DIRT).ok).toBe(true);
    expect(validateAutoActionTarget(ITEM_ID.TECHNO_ORGANIC_ENGINE, ITEM_ID.DIRT_SEED).ok).toBe(true);
  });

  test("binary layout: Heart of Gaia serializes extra type 70 with 16-byte payload", () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(6, 6)!;
    block.fg = ITEM_ID.GAIA_HEART;
    const tile = new AutoActionTile(world, block);
    tile.autoState.gems = 2500;
    tile.autoState.targetItemId = ITEM_ID.DIRT_SEED;
    tile.autoState.enabled = true;

    const buf = new ExtendBuffer(0);
    tile.serialize(buf);
    const data = Buffer.from(buf.data);
    expect(data[0]).toBe(TileExtraTypes.GAIA_HEART); // 70
    expect(data.readUInt32LE(1)).toBe(2500); // gems
    expect(data.readUInt32LE(5)).toBe(0); // next_update_ms
    expect(data.readUInt32LE(9)).toBe(ITEM_ID.DIRT_SEED); // target item
    expect(data.readUInt32LE(13)).toBe(1); // enabled
    expect(data.length).toBe(17); // 1 header + 16 payload
  });

  test("binary layout: Tesseract Manipulator serializes extra type 69 with 16-byte payload", () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(7, 7)!;
    block.fg = ITEM_ID.TESSERACT_MANIPULATOR;
    const tile = new AutoActionTile(world, block);
    tile.autoState.gems = 1200;
    tile.autoState.targetItemId = ITEM_ID.DIRT;
    tile.autoState.enabled = false;

    const buf = new ExtendBuffer(0);
    tile.serialize(buf);
    const data = Buffer.from(buf.data);
    expect(data[0]).toBe(TileExtraTypes.TESSERACT_MANIPULATOR); // 69
    expect(data.readUInt32LE(1)).toBe(1200); // gems
    expect(data.readUInt32LE(5)).toBe(0);
    expect(data.readUInt32LE(9)).toBe(ITEM_ID.DIRT);
    expect(data.readUInt32LE(13)).toBe(0); // disabled
    expect(data.length).toBe(17);
  });

  test("binary layout: Techno-Organic Engine serializes extra type 71 with 26-byte payload", () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(8, 8)!;
    block.fg = ITEM_ID.TECHNO_ORGANIC_ENGINE;
    const tile = new AutoActionTile(world, block);
    tile.autoState.gems = 4000;
    tile.autoState.targetItemId = ITEM_ID.DIRT;
    tile.autoState.enabled = true;

    const buf = new ExtendBuffer(0);
    tile.serialize(buf);
    const data = Buffer.from(buf.data);
    expect(data[0]).toBe(TileExtraTypes.TECHNO_ORGANIC_ENGINE); // 71
    expect(data.readUInt32LE(1)).toBe(4000);
    expect(data.readUInt32LE(9)).toBe(ITEM_ID.DIRT);
    expect(data.readUInt32LE(13)).toBe(1);
    expect(data.length).toBe(27); // 1 header + 16 base + 10 engine payload
  });

  test("autoactionblock dialog refuels gems and selects target", async () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(12, 12)!;
    block.fg = ITEM_ID.TESSERACT_MANIPULATOR;
    const tile = new AutoActionTile(world, block);

    const owner = makePlayer(42);
    owner.world = world;
    owner.gems = 3000;

    const handler = dialogs.get("autoactionblock")!;
    // Refuel 1500 gems
    await handler(owner, new TextParser(`dialog_name|autoactionblock\ntilex|12\ntiley|12\nrefillfuel|1500\n`));
    expect(tile.autoState.gems).toBe(1500);
    expect(owner.gems).toBe(1500);

    // Select target Dirt (2)
    await handler(owner, new TextParser(`dialog_name|autoactionblock\ntilex|12\ntiley|12\nselecttarget|${ITEM_ID.DIRT}\n`));
    expect(tile.autoState.targetItemId).toBe(ITEM_ID.DIRT);
  });

  test("punch toggles enabled state and warns before breaking with gems", async () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const block = world.getTileAt(14, 14)!;
    block.fg = ITEM_ID.GAIA_HEART;
    const tile = new AutoActionTile(world, block);
    tile.autoState.gems = 500;
    tile.autoState.enabled = false;

    const owner = makePlayer(42);
    owner.world = world;

    // First punch toggles enabled to true
    await tile.onPunch(owner);
    expect(tile.autoState.enabled).toBe(true);

    // Second punch while in reset cooldown warns about stored gems
    block.resetStateAt = Date.now() + 5000;
    let bubble = "";
    owner.sendTextBubble = (msg) => { bubble = msg; };
    const broken = await tile.onPunch(owner);
    expect(broken).toBe(false);
    expect(bubble).toContain("lose ALL");
  });

  test("world tick: Heart of Gaia auto-harvests mature trees and consumes gem fuel", () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const machine = world.getTileAt(15, 15)!;
    machine.fg = ITEM_ID.GAIA_HEART;
    machine.autoAction = {
      gems: 10,
      targetItemId: ITEM_ID.DIRT_SEED,
      enabled: true,
    };

    // Mature Dirt Tree at (20, 20)
    const treeTile = world.getTileAt(20, 20)!;
    treeTile.fg = ITEM_ID.DIRT_SEED;
    treeTile.tree = {
      fruit: ITEM_ID.DIRT,
      fruitCount: 3,
      fullyGrownAt: Date.now() - 1000,
      plantedAt: Date.now() - 60000,
      isSpliced: false,
    };

    tickAutoActionMachines(world);

    // Tree should be harvested (fg reset to 0)
    expect(treeTile.fg).toBe(0);
    expect(treeTile.tree).toBeUndefined();
    // 1 gem fuel deducted
    expect(machine.autoAction.gems).toBe(9);
  });

  test("world tick: Tesseract Manipulator auto-breaks target blocks without dropping gems", () => {
    catSpy = mockCatalog();
    const world = makeWorld();
    const machine = world.getTileAt(16, 16)!;
    machine.fg = ITEM_ID.TESSERACT_MANIPULATOR;
    machine.autoAction = {
      gems: 10,
      targetItemId: ITEM_ID.DIRT,
      enabled: true,
    };

    // Target dirt block at (25, 25) with breakHits: 3
    const targetTile = world.getTileAt(25, 25)!;
    targetTile.fg = ITEM_ID.DIRT;
    targetTile.damage = 0;

    // Tick 1: damage becomes 1
    tickAutoActionMachines(world);
    expect(targetTile.damage).toBe(1);
    expect(machine.autoAction.gems).toBe(9);

    // Tick 2: advance clock, damage becomes 2
    machine.autoAction.lastWorkTime = 0;
    tickAutoActionMachines(world);
    expect(targetTile.damage).toBe(2);
    expect(machine.autoAction.gems).toBe(8);

    // Tick 3: block breaks
    machine.autoAction.lastWorkTime = 0;
    tickAutoActionMachines(world);
    expect(targetTile.fg).toBe(0);
    expect(machine.autoAction.gems).toBe(7);
  });
});
