import type { TextParser } from "../../utils/text-parser";
import { Collection } from "../../utils/collection";
import { logger } from "../../utils/logger";
import { getItem } from "../item/item-utils";
import type { Player } from "../player";
import { ITEM_ID, LockPermission, TileFlags } from "../world/constants";
import { tileFrom } from "../world/tiles";

export type DialogHandler = (player: Player, action: TextParser) => Promise<void> | void;

/** Dialog return handlers keyed by `dialog_name`. */
export const dialogs: Collection<string, DialogHandler> = new Collection();

/** Registers a dialog return handler (used by tile and feature modules). */
export function registerDialog(name: string, handler: DialogHandler): void {
  dialogs.set(name, handler);
}

/** Reads the `tilex|tiley` embeds and returns the targeted tile, if valid. */
export function tileFromDialog(player: Player, action: TextParser) {
  const world = player.world;
  if (!world) return null;
  const x = action.getInt("tilex", 0, -1);
  const y = action.getInt("tiley", 0, -1);
  const block = world.getTileAt(x, y);
  return block ? { world, block } : null;
}

function parseCount(player: Player, raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    player.sendTextBubble("Uh oh, thats not a valid number");
    return null;
  }
  return Number.parseInt(raw, 10);
}

registerDialog("gazzette_end", () => {});

registerDialog("door_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target?.block.door) return;
  const { world, block } = target;

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) return;

  block.door = {
    label: action.get("label"),
    destination: action.get("target").toUpperCase(),
    id: action.get("id").toUpperCase(),
  };

  if (action.get("checkbox_public") === "1") block.flags |= TileFlags.PUBLIC;
  else block.flags &= ~TileFlags.PUBLIC;

  tileFrom(world, block).tileUpdate();
  world.markDirty();
});

registerDialog("sign_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target?.block.sign) return;
  const { world, block } = target;

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) return;

  block.sign = { label: action.get("label") };
  tileFrom(world, block).tileUpdate();
  world.markDirty();
});

registerDialog("drop_end", (player, action) => {
  const itemId = action.getInt("itemID", 0, 0);
  const count = parseCount(player, action.get("drop_count"));
  if (count === null) return;

  const owned = player.inventory.getAmount(itemId);
  if (owned <= 0) return player.sendTextBubble("That item, does not exist in your inventory");
  if (count > owned) return player.sendTextBubble("Really?");
  if (count <= 0) return player.sendTextBubble("Nice try. You remind me of myself at that age.");
  if (itemId === ITEM_ID.FIST || itemId === ITEM_ID.WRENCH) return player.sendTextBubble("You'd be sorry if you lost that.");

  const world = player.world;
  if (!world) return;

  const extra = Math.random() * 6;
  const x = player.state.x + (player.state.rotatedLeft ? -25 : 25) + extra;
  const y = player.state.y + extra - Math.floor(Math.random() * 4 - 3);

  player.removeItemInven(itemId, count);
  world.drop(player, x, y, itemId, count);
  player.sendClothesToWorld();
});

registerDialog("trash_end", (player, action) => {
  const itemId = action.getInt("itemID", 0, 0);
  const count = parseCount(player, action.get("trash_count"));
  if (count === null) return;

  const owned = player.inventory.getAmount(itemId);
  if (owned <= 0) return player.sendTextBubble("That item, seems not exist in your inventory");
  if (count > owned) return player.sendTextBubble("Really?");
  if (itemId === ITEM_ID.FIST || itemId === ITEM_ID.WRENCH) return player.sendTextBubble("Cannot trash this item.");
  if (count <= 0) return player.sendTextBubble("Nice try. You remind me of myself at that age.");

  player.removeItemInven(itemId, count);
  player.sendSfx("audio/trash.wav");
  player.sendClothesToWorld();
  player.variants.sendOnConsoleMessage(`You trashed \`w${count} ${getItem(itemId)?.name}`);
});

/**
 * Routes a `dialog_return` action to the handler registered for its `dialog_name`.
 */
export async function handleDialogReturn(player: Player, action: TextParser): Promise<void> {
  const name = action.get("dialog_name");
  const handler = dialogs.get(name);
  if (!handler) {
    logger.debug({ dialog: name, player: player.tankIDName }, "unhandled dialog return");
    return;
  }
  try {
    await handler(player, action);
  } catch (err) {
    logger.error({ err, dialog: name, player: player.tankIDName }, "failed to handle dialog return");
  }
}
