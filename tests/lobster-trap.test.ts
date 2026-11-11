import "../src/game/index";
import { expect, test, spyOn } from "bun:test";
import { getLobsterTrapRewards, LobsterTrapTile, loadLobsterTrap, LOBSTER_TRAP } from "../src/game/world/tiles/lobster-trap-tile";
import { TileFlags } from "../src/game/world/constants";
import type { TileData } from "../src/game/world/types";
import type { World } from "../src/game/world/world";
import type { Player } from "../src/game/player";

test("bait and depth gate lobster trap rewards", () => {
  expect(getLobsterTrapRewards(3012, 1).pool).not.toContain(3450);
  expect(getLobsterTrapRewards(3012, 2).pool).toContain(3450);
  expect(getLobsterTrapRewards(3012, 2).pool).not.toContain(3456);
  expect(getLobsterTrapRewards(3012, 3).pool).toContain(3456);
  expect(getLobsterTrapRewards(3016, 1).pool).not.toContain(3454);
  expect(getLobsterTrapRewards(3016, 2).pool).toContain(3454);
  expect(getLobsterTrapRewards(3016, 2).pool).not.toContain(3464);
  expect(getLobsterTrapRewards(3016, 3).pool).toContain(3464);
  expect(getLobsterTrapRewards(3018, 2).pool).not.toContain(3812);
  expect(getLobsterTrapRewards(3018, 3).pool).toContain(3812);
});

test.each([0, 1, 2, 3])("depth %i scales basic bait and leaves Whizmo capped", (depth) => {
  expect(getLobsterTrapRewards(2914, depth).maxLbs).toBe(5 * (depth + 1));
  expect(getLobsterTrapRewards(3020, depth).maxLbs).toBe(200);
});

test("depth counts consecutive water above, ignores foreground, and caps at three", () => {
  let gap = -1;
  const world = { getTileAt: (_x: number, y: number) => y < 0 ? undefined : ({ fg: 2, flags: y === gap ? 0 : TileFlags.WATER }) } as World;
  const tile = new LobsterTrapTile(world, { x: 1, y: 5 } as TileData);
  expect(tile.depth()).toBe(3);
  gap = 3;
  expect(tile.depth()).toBe(1);
  gap = 4;
  expect(tile.depth()).toBe(0);
  tile.data.y = 0;
  expect(tile.depth()).toBe(0);
});

test("catch awards actual pounds, drops overflow, and cannot be harvested twice concurrently", async () => {
  const block = { x: 1, y: 5, fg: LOBSTER_TRAP, trap: { baitId: 2914, readyAt: Date.now() - 1000 } } as TileData;
  const added: number[] = [];
  const dropped: number[] = [];
  const world = {
    hasTilePermission: async () => true, getTileAt: () => undefined,
    markDirty: () => {}, playPositioned: () => {},
    drop: (_p: Player, _x: number, _y: number, _id: number, amount: number) => { dropped.push(amount); },
  } as unknown as World;
  const player = {
    addItemInven: (_id: number, amount: number) => { added.push(amount); return 2; },
    sendTextBubble: () => {},
  } as unknown as Player;
  const tile = new LobsterTrapTile(world, block);
  const update = spyOn(tile, "tileUpdate").mockImplementation(() => {});
  const random = spyOn(Math, "random").mockReturnValue(0.99);
  try {
    await Promise.all([tile.onPunch(player), tile.onPunch(player)]);
    expect(added).toEqual([5]);
    expect(dropped).toEqual([3]);
    expect(block.trap).toBeUndefined();
  } finally { update.mockRestore(); random.mockRestore(); }
});

test("expired trap clears without awarding a catch", async () => {
  const block = { fg: LOBSTER_TRAP, trap: { baitId: 2914, readyAt: Date.now() - 86400001 } } as TileData;
  const world = { hasTilePermission: async () => true, markDirty: () => {} } as unknown as World;
  const tile = new LobsterTrapTile(world, block);
  const update = spyOn(tile, "tileUpdate").mockImplementation(() => {});
  try {
    await tile.onPunch({ sendTextBubble: () => {} } as unknown as Player);
    expect(block.trap).toBeUndefined();
  } finally { update.mockRestore(); }
});

test("loading requires all five bait to be consumed", async () => {
  const block = { fg: LOBSTER_TRAP } as TileData;
  const player = {
    inventory: { getAmount: () => 5 }, removeItemInven: () => 0,
  } as unknown as Player;
  expect(await loadLobsterTrap(player, { hasTilePermission: async () => true } as unknown as World, block, 2914)).toBe(true);
  expect(block.trap).toBeUndefined();
});
