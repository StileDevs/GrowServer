import type { TextParser } from "../../../utils/text-parser";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { MAX_ITEM_STACK } from "../../player/inventory";
import type { World } from "../world";
import type { Vending } from "../types";
import { ActionTypes, BlockFlags, ITEM_ID } from "../constants";
import { BLUE_GEM_LOCK_VALUE, countWorldLocks, DIAMOND_LOCK_VALUE, VendingTile } from "./vending-tile";

/** Highest price (in world locks or items) the owner may set. */
const MAX_PRICE = 20_000;

const LOCK_ITEMS: ReadonlySet<number> = new Set([ITEM_ID.WORLD_LOCK, ITEM_ID.DIAMOND_LOCK, ITEM_ID.BLUE_GEM_LOCK]);

function itemName(id: number): string {
  return getItem(id)?.name ?? "item";
}

/** Tells one player something, as a bubble and in the console. */
function tell(player: Player, message: string): void {
  player.sendTextBubble(message, true);
  player.variants.sendOnConsoleMessage(message);
}

/** Sound everyone hears when the owner changes the price. */
const PRICE_CHANGE_SOUND = "audio/terraform.wav";

/**
 * Tells everyone in the world what the owner did: a bubble over the owner
 * and a console line, optionally with a sound, like the real game.
 */
function announce(world: World, player: Player, message: string, sfx?: string): void {
  for (const other of world.players) {
    other.variants.sendOnTalkBubble(player.netID, message, false);
    other.variants.sendOnConsoleMessage(message);
    if (sfx) other.sendSfx(sfx);
  }
}

// --- owner -------------------------------------------------------------

function stock(player: Player, world: World, tile: VendingTile, itemId: number): boolean {
  const v = tile.vending;
  if (v.itemId !== 0 || itemId <= 0) return false;

  const have = player.inventory.getAmount(itemId);
  if (have <= 0) return false;

  const item = getItem(itemId);
  if (!item) return false;

  if (item.type === ActionTypes.LOCK || LOCK_ITEMS.has(itemId)) {
    tell(player, "No no no.");
    return false;
  }
  if ((item.flags ?? 0) & BlockFlags.UNTRADEABLE || itemId === tile.data.fg) {
    tell(player, `Can't put that in a ${itemName(tile.data.fg)}.`);
    return false;
  }

  const removed = player.removeItemInven(itemId, have);
  if (removed <= 0) return false;
  v.itemId = itemId;
  v.count = removed;

  announce(world, player, `\`7[\`\`${player.displayName} put \`2${item.name}\`\` in the ${itemName(tile.data.fg)}.\`7]\`\``);
  return true;
}

function addStock(player: Player, tile: VendingTile): boolean {
  const v = tile.vending;
  if (v.itemId === 0) return false;

  const have = player.inventory.getAmount(v.itemId);
  if (have <= 0) return false;

  const removed = player.removeItemInven(v.itemId, have);
  if (removed <= 0) return false;
  v.count += removed;
  tell(player, `Added ${removed} items to the machine.`);
  return true;
}

function pullStock(player: Player, tile: VendingTile): boolean {
  const v = tile.vending;
  if (v.itemId === 0) return false;

  const have = player.inventory.getAmount(v.itemId);
  const room = have > 0 ? MAX_ITEM_STACK - have : player.inventory.isFull ? 0 : MAX_ITEM_STACK;
  if (room <= 0) {
    tell(player, "You don't have room in your backpack!");
    return false;
  }

  const name = itemName(v.itemId);
  if (v.count <= room) {
    player.addItemInven(v.itemId, v.count);
    tell(player, `You picked up ${v.count} ${name}.`);
    v.itemId = 0;
    v.count = 0;
    v.price = 0;
  } else {
    player.addItemInven(v.itemId, room);
    v.count -= room;
    tell(player, `You picked up ${room} ${name}, leaving ${v.count} in the machine.`);
  }
  return true;
}

function withdraw(player: Player, tile: VendingTile): boolean {
  const v = tile.vending;
  if (v.earned <= 0) return false;

  const diamonds = Math.floor(v.earned / DIAMOND_LOCK_VALUE);
  const worldLocks = v.earned % DIAMOND_LOCK_VALUE;
  const haveWL = player.inventory.getAmount(ITEM_ID.WORLD_LOCK);
  const haveDL = player.inventory.getAmount(ITEM_ID.DIAMOND_LOCK);

  if (haveWL + worldLocks > MAX_ITEM_STACK || haveDL + diamonds > MAX_ITEM_STACK) {
    tell(player, "You don't have room in your backpack!");
    return false;
  }
  if ((diamonds > 0 && !player.inventory.canAddItem(ITEM_ID.DIAMOND_LOCK, diamonds)) || (worldLocks > 0 && !player.inventory.canAddItem(ITEM_ID.WORLD_LOCK, worldLocks))) {
    tell(player, "You don't have room in your backpack!");
    return false;
  }

  if (diamonds) player.addItemInven(ITEM_ID.DIAMOND_LOCK, diamonds);
  if (worldLocks) player.addItemInven(ITEM_ID.WORLD_LOCK, worldLocks);
  v.earned = 0;

  const parts: string[] = [];
  if (diamonds) parts.push(`${diamonds} Diamond Locks`);
  if (worldLocks) parts.push(`${worldLocks} World Locks`);
  tell(player, `You collected ${parts.join(" and ")}.`);
  return true;
}

function setPrice(player: Player, world: World, tile: VendingTile, action: TextParser): boolean {
  const v = tile.vending;

  if (action.get("chk_peritem") === "1" && action.get("chk_perlock") === "1") {
    tell(player, "You can't have it both ways.");
    return false;
  }
  const perLock = action.get("chk_perlock") === "1";
  const raw = action.get("setprice").trim();
  const price = /^-?\d+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isNaN(price) || price === 0) {
    v.price = 0;
    announce(world, player, `\`7[\`\`${player.displayName} disabled the ${itemName(tile.data.fg)}.\`7]\`\``, PRICE_CHANGE_SOUND);
    return true;
  }
  if (price < 0 || price > MAX_PRICE) {
    tell(player, "Well, that's a silly price.");
    return false;
  }
  if (perLock) {
    if (price > v.count) {
      tell(player, "You don't have enough in there for anyone to buy at that price!");
      return false;
    }
    if (price > MAX_ITEM_STACK) {
      tell(player, "That price is so low, nobody can carry a World Lock worth of items!");
      return false;
    }
  }

  v.price = perLock ? -price : price;
  const priceText = perLock ? `${price} per World Lock` : `${price} World Lock${price === 1 ? "" : "s"} each`;
  announce(world, player, `\`7[\`\`${player.displayName} changed the price of \`2${itemName(v.itemId)}\`\` to ${priceText}.\`7]\`\``, PRICE_CHANGE_SOUND);
  return true;
}

function ownerAction(player: Player, world: World, tile: VendingTile, action: TextParser): boolean {
  const button = action.get("buttonClicked");

  let changed = false;
  if (action.contains("stockitem")) changed = stock(player, world, tile, action.getInt("stockitem", 0, 0));
  else if (button === "addstock") changed = addStock(player, tile);
  else if (button === "pullstock") changed = pullStock(player, tile);
  else if (button === "withdraw") changed = withdraw(player, tile);
  else if (action.contains("setprice")) changed = setPrice(player, world, tile, action);

  if (changed) {
    // the client only learns about stock moves from a full backpack refresh
    player.sendInventory();
    tile.sendDialog(player);
  }
  return changed;
}

// --- buyer -------------------------------------------------------------

/**
 * Takes `cost` world locks from the buyer, breaking diamond and blue gem
 * locks into change when needed.
 * @returns false when the change would not fit in the backpack.
 */
function pay(player: Player, cost: number): boolean {
  const nowWL = player.inventory.getAmount(ITEM_ID.WORLD_LOCK);
  const nowDL = player.inventory.getAmount(ITEM_ID.DIAMOND_LOCK);
  const nowBGL = player.inventory.getAmount(ITEM_ID.BLUE_GEM_LOCK);

  let wl = nowWL;
  let dl = nowDL;
  let bgl = nowBGL;

  // Break locks until the small ones cover the cost.
  while (wl < cost && dl > 0) {
    dl--;
    wl += DIAMOND_LOCK_VALUE;
  }
  while (wl < cost && bgl > 0) {
    bgl--;
    dl += BLUE_GEM_LOCK_VALUE / DIAMOND_LOCK_VALUE - 1;
    wl += DIAMOND_LOCK_VALUE;
  }
  if (wl < cost) return false;
  wl -= cost;

  if (wl > MAX_ITEM_STACK || dl > MAX_ITEM_STACK) return false;
  if ((nowDL === 0 && dl > 0 && !player.inventory.canAddItem(ITEM_ID.DIAMOND_LOCK, dl)) || (nowWL === 0 && wl > 0 && !player.inventory.canAddItem(ITEM_ID.WORLD_LOCK, wl))) {
    return false;
  }

  const take = (id: number, n: number) => {
    if (n > 0) player.removeItemInven(id, n);
  };
  const give = (id: number, n: number) => {
    if (n > 0) player.addItemInven(id, n);
  };

  take(ITEM_ID.BLUE_GEM_LOCK, nowBGL - bgl);
  take(ITEM_ID.DIAMOND_LOCK, nowDL - dl);
  give(ITEM_ID.DIAMOND_LOCK, dl - nowDL);
  take(ITEM_ID.WORLD_LOCK, nowWL - wl);
  give(ITEM_ID.WORLD_LOCK, wl - nowWL);
  return true;
}

function buy(player: Player, world: World, tile: VendingTile, action: TextParser): boolean {
  const v: Vending = tile.vending;
  if (!action.contains("buycount")) return false;
  if (v.itemId === 0 || v.price === 0) return false;

  // The offer must still be the one the buyer saw.
  if (action.getInt("expectprice", 0, 0) !== v.price || action.getInt("expectitem", 0, 0) !== v.itemId) {
    tell(player, "The machine's offer has changed. Please check it again.");
    return false;
  }

  const raw = action.get("buycount").trim();
  if (!/^-?\d+$/.test(raw)) return false;
  const want = Number.parseInt(raw, 10);
  if (want === 0) return false;
  if (want < 0) {
    tell(player, "NEGATIVE, DOES NOT COMPUTE");
    return false;
  }

  // price > 0: `want` items at `price` WL each.
  // price < 0: `want` items, sold only in multiples of |price| per WL.
  let items: number;
  let cost: number;
  if (v.price > 0) {
    items = want;
    cost = want * v.price;
  } else {
    const perLock = -v.price;
    if (want < perLock) {
      tell(player, "You have to buy at least 1 World Lock's worth.");
      return false;
    }
    cost = Math.floor(want / perLock);
    items = cost * perLock;
  }

  if (items > v.count) {
    tell(player, "There aren't enough available to fulfill your order!");
    return false;
  }
  if (cost > countWorldLocks(player)) {
    tell(player, "You can't afford that many!");
    return false;
  }
  if (!player.inventory.canAddItem(v.itemId, items)) {
    tell(player, "You don't have room in your backpack!");
    return false;
  }

  // first pass: the real game asks the buyer to confirm the deal
  if (!action.contains("verify")) {
    player.variants.sendOnDialogRequest(tile.purchaseConfirmation(cost, items, want).str());
    return false;
  }

  if (!pay(player, cost)) {
    tell(player, "You don't have room in your backpack!");
    return false;
  }
  player.addItemInven(v.itemId, items);

  const name = itemName(v.itemId);
  v.count -= items;
  v.earned += cost;
  if (v.count <= 0) {
    v.itemId = 0;
    v.price = 0;
    v.count = 0;
  }

  announce(world, `\`7[\`\`\`9${player.displayName} bought ${items} ${name} for ${cost} World Lock${cost === 1 ? "" : "s"}.\`\`\`7]\`\``);
  world.playPositioned("audio/cash_register.wav", player.netID);
  return true;
}

/**
 * dialog_name "vending": every button and input of the vending machine
 * dialog, for the owner (stock, price, withdraw, empty) and buyers (buy).
 */
registerDialog("vending", (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;
  if (getItem(block.fg)?.type !== ActionTypes.VENDING_MACHINE) return;

  const tile = new VendingTile(world, block);
  if (!tile.isPlayerOnMachine(player)) {
    player.sendTextBubble("Get closer!", false);
    return;
  }

  const changed = tile.canEdit(player) ? ownerAction(player, world, tile, action) : buy(player, world, tile, action);

  if (changed) {
    if (!tile.canEdit(player)) player.sendInventory();
    tile.tileUpdate();
    world.markDirty();
  }
});
