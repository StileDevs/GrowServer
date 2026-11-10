import "../src/game/index";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import type { ItemDefinition } from "grow-items";
import * as itemUtils from "../src/game/item/item-utils";
import { Player } from "../src/game/player";
import { PlayModController } from "../src/game/player/play-mod-controller";
import { Collection } from "../src/utils/collection";
import { ExtendBuffer } from "../src/utils/extend-buffer";
import { TextParser } from "../src/utils/text-parser";
import { dialogs } from "../src/game/network/dialog-handler";
import { ActionTypes, BlockFlags, ITEM_ID } from "../src/game/world/constants";
import { World } from "../src/game/world/world";
import type { TileData } from "../src/game/world/types";
import { Tile } from "../src/game/world/tile";
import { MagplantTile } from "../src/game/world/tiles/magplant-tile";
import { bindMagplantRemote, clearMagplantRemote, collectMagplantDrop, placeWithMagplantRemote, tickMagplantRemotes } from "../src/game/world/magplant";

describe("Legal Briefs auto use", () => {
  test.each([1, 2])("consumes one equipped briefs from a stack of %i on malpractice", (initial) => {
    let count = initial;
    const player = {
      netID: 1, inventory: { isEquipped: () => count > 0, hasItem: () => count > 0 },
      removeItemInven: () => { count--; return 1; },
      sendTextBubble: () => {}, sendSfx: () => {}, sendCharacterState: () => {}, sendClothesToWorld: () => {},
      variants: { sendOnConsoleMessage: () => {} },
      tryUseLegalBriefs: Player.prototype.tryUseLegalBriefs,
    } as unknown as Player;
    player.playMods = new PlayModController(player);
    player.playMods.add("malpractice");
    expect(count).toBe(initial - 1);
    expect(player.playMods.has("malpractice")).toBe(false);
    player.playMods.tick();
    expect(count).toBe(initial - 1);
  });

  test("does not consume unequipped briefs", () => {
    let used = false;
    const player = { netID: 1, inventory: { isEquipped: () => false },
      tryUseLegalBriefs: () => { used = true; return true; },
      variants: { sendOnConsoleMessage: () => {} }, sendCharacterState: () => {},
    } as unknown as Player;
    const mods = new PlayModController(player);
    mods.add("malpractice");
    expect(mods.has("malpractice")).toBe(true);
    expect(used).toBe(false);
  });
});

describe("MAGPLANT 5000", () => {
  const connected: Player[] = [];
  afterEach(() => { for (const player of connected.splice(0)) clearMagplantRemote(player); });

  function fixture() {
    const machine = { x: 0, y: 0, fg: ITEM_ID.MAGPLANT, bg: 0, flags: 0,
      magplant: { instanceId: "test", itemId: 2, count: 10, collecting: true, planting: true },
    } as TileData;
    const target = { x: 1, y: 0, fg: 0, bg: 0, flags: 0 } as TileData;
    const blocks = [machine, target];
    let owner: number | undefined = 1;
    let allowed = true;
    const world = { name: "TEST", players: [], data: { width: 2, blocks, dropped: { uid: 0, items: [] } },
      getOwnerPlayerId: () => owner, isWorldAdmin: () => false,
      getTileAt: (x: number, y: number) => y === 0 ? blocks[x] : undefined,
      hasTilePermission: async () => allowed, markDirty: () => {}, broadcast: () => {},
      playPositioned: () => {}, getTileOwnerName: async () => "owner",
      drop: World.prototype.drop,
    } as unknown as World;
    const inventory = new Collection<number, number>();
    const player = { world, playerId: 1, netID: 1, state: { rotatedLeft: false },
      inventory: { getAmount: (id: number) => inventory.get(id) ?? 0, hasItem: (id: number) => (inventory.get(id) ?? 0) > 0 },
      addItemInven: (id: number, n: number) => { inventory.set(id, (inventory.get(id) ?? 0) + n); return n; },
      removeItemInven: (id: number, n: number) => { const taken = Math.min(n, inventory.get(id) ?? 0); inventory.set(id, (inventory.get(id) ?? 0) - taken); return taken; },
      sendInventory: () => {}, sendTextBubble: () => {}, sendPlayPositioned: () => {},
      variants: { sendVariant: () => {}, sendOnDialogRequest: () => {} },
      playMods: { has: () => false },
    } as unknown as Player;
    connected.push(player);
    return { machine, target, blocks, world, player, inventory, setOwner: (id: number | undefined) => { owner = id; }, setAllowed: (value: boolean) => { allowed = value; } };
  }

  test("collects block and harvest drops, but leaves manual/reward drops on the ground", () => {
    const f = fixture();
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 2, type: ActionTypes.FOREGROUND } as ItemDefinition);
    try {
      f.world.drop(f.player, 32, 0, 2, 5, { origin: "block" });
      f.world.drop(f.player, 32, 0, 2, 5, { origin: "harvest" });
      expect(f.machine.magplant!.count).toBe(20);
      expect(f.world.data.dropped.items).toHaveLength(0);
      f.world.drop(f.player, 32, 0, 2, 5, { tree: true });
      expect(f.machine.magplant!.count).toBe(20);
      expect(f.world.data.dropped.items[0]!.amount).toBe(5);
    } finally { item.mockRestore(); }
  });

  test("caps capacity, preserves overflow, skips full and unlocked machines", () => {
    const f = fixture();
    f.machine.magplant!.count = 4998;
    expect(collectMagplantDrop(f.world, 2, 5)).toBe(3);
    expect(f.machine.magplant!.count).toBe(5000);
    expect(collectMagplantDrop(f.world, 2, 5)).toBe(5);
    f.setOwner(undefined);
    expect(collectMagplantDrop(f.world, 2, 5)).toBe(5);
  });

  test.each([0, 10, 5000])("matches V8 form_visual bytes for stock %i after reload", (count) => {
    const f = fixture();
    f.machine.magplant!.count = count;
    const reloaded = JSON.parse(JSON.stringify(f.machine)) as TileData;
    const buffer = new ExtendBuffer(0);
    new MagplantTile(f.world, reloaded).serialize(buffer);
    expect(buffer.data.length).toBe(15);
    buffer.mempos = 0;
    expect(buffer.readU8()).toBe(62);
    expect(buffer.readU32()).toBe(2);
    expect(buffer.readU32()).toBe(count);
    expect(buffer.readU8()).toBe(1);
    expect(buffer.readU8()).toBe(1);
    expect(buffer.readU8()).toBe(0);
    expect(buffer.readU16()).toBe(5000);
    expect(buffer.readU8()).toBe(0);
    expect(reloaded.magplant!.count).toBe(count);
  });

  test("remote places from storage without granting or consuming backpack blocks", async () => {
    const f = fixture();
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 2, type: ActionTypes.FOREGROUND } as ItemDefinition);
    try {
      expect(bindMagplantRemote(f.player, f.world, f.machine)).toBe(true);
      await placeWithMagplantRemote(f.player, f.world, f.target);
      expect(f.target.fg).toBe(2);
      expect(f.machine.magplant!.count).toBe(9);
      expect(f.inventory.get(2)).toBeUndefined();
      await placeWithMagplantRemote(f.player, f.world, f.target);
      expect(f.machine.magplant!.count).toBe(9);
    } finally { item.mockRestore(); }
  });

  test("rejected placement and stale machine bindings consume no stock", async () => {
    const f = fixture();
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 2, type: ActionTypes.FOREGROUND } as ItemDefinition);
    try {
      bindMagplantRemote(f.player, f.world, f.machine);
      f.setAllowed(false);
      await placeWithMagplantRemote(f.player, f.world, f.target);
      expect(f.machine.magplant!.count).toBe(10);
      f.machine.magplant = { ...f.machine.magplant! };
      await placeWithMagplantRemote(f.player, f.world, f.target);
      expect(f.inventory.get(ITEM_ID.MAGPLANT_REMOTE)).toBe(0);
      expect(f.machine.magplant.count).toBe(10);
    } finally { item.mockRestore(); }
  });

  test.each([ActionTypes.SEED, ActionTypes.BACKGROUND])("remote uses the existing placement handler for type %i", async (type) => {
    const f = fixture();
    const itemId = type === ActionTypes.SEED ? 3 : 4;
    f.machine.magplant!.itemId = itemId;
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: itemId, type, growTime: 60 } as ItemDefinition);
    try {
      bindMagplantRemote(f.player, f.world, f.machine);
      await placeWithMagplantRemote(f.player, f.world, f.target);
      expect(f.machine.magplant!.count).toBe(9);
      if (type === ActionTypes.SEED) {
        expect(f.target.fg).toBe(3);
        expect(f.target.tree?.fruit).toBe(2);
        expect(f.target.tree!.fullyGrownAt - f.target.tree!.plantedAt).toBe(60_000);
      } else expect(f.target.bg).toBe(4);
      expect(f.inventory.get(itemId)).toBeUndefined();
    } finally { item.mockRestore(); }
  });

  test("overlapping placement requests cannot spend the last stored item twice", async () => {
    const f = fixture();
    f.machine.magplant!.count = 1;
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 2, type: ActionTypes.FOREGROUND } as ItemDefinition);
    try {
      bindMagplantRemote(f.player, f.world, f.machine);
      await Promise.all([placeWithMagplantRemote(f.player, f.world, f.target), placeWithMagplantRemote(f.player, f.world, f.target)]);
      expect(f.target.fg).toBe(2);
      expect(f.machine.magplant!.count).toBe(0);
    } finally { item.mockRestore(); }
  });

  test("visitors need building mode active and lose remote access with the lock", () => {
    const f = fixture();
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 2, type: ActionTypes.FOREGROUND } as ItemDefinition);
    try {
    f.machine.magplant!.planting = false;
    f.player.playerId = 2;
    expect(bindMagplantRemote(f.player, f.world, f.machine)).toBe(false);
    f.machine.magplant!.planting = true;
    expect(bindMagplantRemote(f.player, f.world, f.machine)).toBe(true);
    f.setOwner(undefined);
    tickMagplantRemotes();
    expect(f.inventory.get(ITEM_ID.MAGPLANT_REMOTE)).toBe(0);
    } finally { item.mockRestore(); }
  });

  test("owner can withdraw partial stock but outsiders cannot forge storage actions", async () => {
    const f = fixture();
    const update = spyOn(Tile.prototype, "tileUpdate").mockImplementation(() => {});
    const wrench = spyOn(MagplantTile.prototype, "onWrench").mockResolvedValue(true);
    try {
      const action = new TextParser("tilex|0\ntiley|0\nbuttonClicked|Retrieve\nstorageitem|2\nmachine|test\nitemtoremove|10");
      f.player.playerId = 2;
      await dialogs.get("itemremovedfromsucker")!(f.player, action);
      expect(f.machine.magplant!.count).toBe(10);
      f.player.playerId = 1;
      await dialogs.get("itemremovedfromsucker")!(f.player, action);
      expect(f.machine.magplant!.count).toBe(0);
      expect(f.inventory.get(2)).toBe(10);
    } finally { update.mockRestore(); wrench.mockRestore(); }
  });

  test("uses ItsKyy/V8 dialog controls for empty and stocked machines", async () => {
    const f = fixture();
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 2, name: "Dirt", type: ActionTypes.FOREGROUND } as ItemDefinition);
    const send = spyOn(f.player.variants, "sendOnDialogRequest");
    try {
      const tile = new MagplantTile(f.world, f.machine);
      await tile.onWrench(f.player);
      let dialog = send.mock.calls.at(-1)![0];
      expect(dialog).toContain("end_dialog|itemsucker_block|Close|Update|");
      expect(dialog).toContain("add_button|retrieveitem|");
      expect(dialog).toContain("add_button|getplantationdevice|");
      expect(dialog).toContain("add_checkbox|chk_enablesucking|");
      expect(dialog).not.toContain("Building mode:");
      expect(dialog).not.toContain("checkbox_gemcollection");
      f.machine.magplant!.count = 0;
      f.machine.magplant!.itemId = 0;
      await tile.onWrench(f.player);
      dialog = send.mock.calls.at(-1)![0];
      expect(dialog).toContain("end_dialog|itemsucker_block|Close||");
      expect(dialog).toContain("add_item_picker|selectitem|Choose Item|");
      expect(dialog).not.toContain("add_button|getplantationdevice|");
    } finally { item.mockRestore(); send.mockRestore(); }
  });

  test("selection configures collection without depositing, supports duplicate targets, and rejects untradeables", async () => {
    const f = fixture();
    f.machine.magplant!.count = 0;
    f.inventory.set(4, 10);
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 4, type: ActionTypes.FOREGROUND } as ItemDefinition);
    const update = spyOn(Tile.prototype, "tileUpdate").mockImplementation(() => {});
    const wrench = spyOn(MagplantTile.prototype, "onWrench").mockResolvedValue(true);
    const select = () => dialogs.get("itemsucker_block")!(f.player, new TextParser("tilex|0\ntiley|0\nselectitem|4"));
    try {
      item.mockReturnValue({ id: 4, flags: BlockFlags.UNTRADEABLE } as ItemDefinition);
      await select();
      expect(f.machine.magplant!.itemId).toBe(2);
      item.mockReturnValue({ id: 4, type: ActionTypes.FOREGROUND } as ItemDefinition);
      f.target.fg = ITEM_ID.MAGPLANT;
      f.target.magplant = { instanceId: "other", itemId: 4, count: 0 };
      await select();
      expect(f.machine.magplant!.itemId).toBe(4);
      f.target.fg = 0;
      await select();
      expect(f.machine.magplant!.itemId).toBe(4);
      expect(f.machine.magplant!.count).toBe(0);
      expect(f.inventory.get(4)).toBe(10);
      f.machine.magplant!.count = 5;
      f.machine.magplant!.itemId = 2;
      await select();
      expect(f.machine.magplant!.itemId).toBe(2);
      expect(f.machine.magplant!.count).toBe(5);
    } finally { item.mockRestore(); update.mockRestore(); wrench.mockRestore(); }
  });

  test("preserves earlier stored gems for withdrawal without offering GTOS gem collection", async () => {
    const f = fixture();
    f.machine.magplant!.count = 6000;
    f.machine.magplant!.itemId = ITEM_ID.GEMS;
    let gems = 0;
    f.player.addGems = (amount) => { gems += amount; };
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: ITEM_ID.GEMS, type: ActionTypes.CONSUMABLE } as ItemDefinition);
    const update = spyOn(Tile.prototype, "tileUpdate").mockImplementation(() => {});
    const wrench = spyOn(MagplantTile.prototype, "onWrench").mockResolvedValue(true);
    const submit = (fields: string) => dialogs.get("itemsucker_block")!(f.player, new TextParser(`tilex|0\ntiley|0\n${fields}`));
    try {
      expect(collectMagplantDrop(f.world, ITEM_ID.GEMS, 5)).toBe(5);
      expect(f.machine.magplant!.count).toBe(6000);
      expect(bindMagplantRemote(f.player, f.world, f.machine)).toBe(false);
      await submit("buttonClicked|retrieveitem");
      expect(gems).toBe(6000);
      expect(f.machine.magplant!.count).toBe(0);
      expect(f.inventory.has(ITEM_ID.GEMS)).toBe(false);
      await submit("buttonClicked|clearitem");
      expect(f.machine.magplant!.itemId).toBe(0);
    } finally { item.mockRestore(); update.mockRestore(); wrench.mockRestore(); }
  });

  test("remotes can bind empty configured machines but exclude auto-pickup items", () => {
    const f = fixture();
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 2, type: ActionTypes.FOREGROUND } as ItemDefinition);
    try {
      f.machine.magplant!.count = 0;
      expect(bindMagplantRemote(f.player, f.world, f.machine)).toBe(true);
      clearMagplantRemote(f.player);
      f.machine.magplant!.count = 10;
      item.mockReturnValue({ id: 2, type: ActionTypes.FOREGROUND, flags: BlockFlags.AUTO_PICKUP } as ItemDefinition);
      expect(bindMagplantRemote(f.player, f.world, f.machine)).toBe(false);
      expect(f.inventory.get(ITEM_ID.MAGPLANT_REMOTE)).toBe(0);
    } finally { item.mockRestore(); }
  });

  test("amount dialogs transfer requested stock safely and reject stale or malformed submissions", async () => {
    const f = fixture();
    f.inventory.set(2, 30);
    const update = spyOn(Tile.prototype, "tileUpdate").mockImplementation(() => {});
    const wrench = spyOn(MagplantTile.prototype, "onWrench").mockResolvedValue(true);
    const send = spyOn(f.player.variants, "sendOnDialogRequest");
    const submit = (adding: boolean, amount: string, extra = "storageitem|2\nmachine|test") => dialogs.get(adding ? "itemaddedtosucker" : "itemremovedfromsucker")!(
      f.player, new TextParser(`tilex|0\ntiley|0\n${extra}\n${adding ? "itemtoadd" : "itemtoremove"}|${amount}`));
    try {
      await dialogs.get("itemsucker_block")!(f.player, new TextParser("tilex|0\ntiley|0\nbuttonClicked|additem"));
      expect(send.mock.calls.at(-1)![0]).toContain("end_dialog|itemaddedtosucker|Close|Add|");
      expect(f.inventory.get(2)).toBe(30);
      await submit(true, "7");
      expect(f.machine.magplant!.count).toBe(17);
      expect(f.inventory.get(2)).toBe(23);
      await submit(false, "5");
      expect(f.machine.magplant!.count).toBe(12);
      expect(f.inventory.get(2)).toBe(28);
      for (const raw of ["-1", "1junk", "1.5", "0", "999999999999999999999999999"]) await submit(true, raw);
      await submit(false, "5", "storageitem|4\nmachine|test");
      await submit(false, "5", "storageitem|2\nmachine|replaced");
      expect(f.machine.magplant!.count).toBe(12);
      expect(f.inventory.get(2)).toBe(28);
      f.machine.magplant!.count = 4999;
      await submit(true, "200");
      expect(f.machine.magplant!.count).toBe(5000);
      expect(f.inventory.get(2)).toBe(27);
      const add = spyOn(f.player, "addItemInven").mockReturnValue(0);
      try {
        await submit(false, "200");
        expect(f.machine.magplant!.count).toBe(5000);
      } finally { add.mockRestore(); }
    } finally { update.mockRestore(); wrench.mockRestore(); send.mockRestore(); }
  });

  test("collection toggle is independent of building mode and survives reload", async () => {
    const f = fixture();
    const update = spyOn(Tile.prototype, "tileUpdate").mockImplementation(() => {});
    const wrench = spyOn(MagplantTile.prototype, "onWrench").mockResolvedValue(true);
    try {
      await dialogs.get("itemsucker_block")!(f.player, new TextParser("tilex|0\ntiley|0\nbuttonClicked|Update\nchk_enablesucking|0"));
      expect(collectMagplantDrop(f.world, 2, 5)).toBe(5);
      const reloaded = JSON.parse(JSON.stringify(f.machine)) as TileData;
      expect(reloaded.magplant!.collecting).toBe(false);
      expect(reloaded.magplant!.planting).toBe(true);
      await dialogs.get("itemsucker_block")!(f.player, new TextParser("tilex|0\ntiley|0\nbuttonClicked|Update\nchk_enablesucking|1"));
      expect(collectMagplantDrop(f.world, 2, 5)).toBe(0);
      expect(f.machine.magplant!.count).toBe(15);
    } finally { update.mockRestore(); wrench.mockRestore(); }
  });

  test("owner punch toggles building and revokes visitor remotes without changing stock", async () => {
    const f = fixture();
    f.machine.magplant!.planting = false;
    const item = spyOn(itemUtils, "getItem").mockReturnValue({ id: 2, type: ActionTypes.FOREGROUND } as ItemDefinition);
    const update = spyOn(Tile.prototype, "tileUpdate").mockImplementation(() => {});
    try {
      const tile = new MagplantTile(f.world, f.machine);
      bindMagplantRemote(f.player, f.world, f.machine);
      await placeWithMagplantRemote(f.player, f.world, f.target);
      expect(f.target.fg).toBe(0);
      await tile.onPunch(f.player);
      expect(f.machine.magplant!.planting).toBe(true);
      expect(f.inventory.get(ITEM_ID.MAGPLANT_REMOTE)).toBe(1);
      f.player.playerId = 2;
      await tile.onPunch(f.player);
      expect(f.machine.magplant!.planting).toBe(true);
      f.player.playerId = 1;
      f.machine.resetStateAt = 0;
      await tile.onPunch(f.player);
      expect(f.machine.magplant!.planting).toBe(false);
      expect(f.inventory.get(ITEM_ID.MAGPLANT_REMOTE)).toBe(0);
      expect(f.machine.magplant!.count).toBe(10);
    } finally { item.mockRestore(); update.mockRestore(); }
  });

  test("legacy mode defaults preserve stock and serialize the disabled building flag", () => {
    const f = fixture();
    delete f.machine.magplant!.collecting;
    delete f.machine.magplant!.planting;
    const buffer = new ExtendBuffer(0);
    new MagplantTile(f.world, f.machine).serialize(buffer);
    expect(buffer.data[9]).toBe(1);
    expect(buffer.data[10]).toBe(0);
    expect(f.machine.magplant!.count).toBe(10);
  });
});
