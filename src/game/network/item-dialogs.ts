import { getItem } from "../item/item-utils";
import type { Player } from "../player";
import { ActionTypes, ITEM_ID } from "../world/constants";
import { registerDialog } from "./dialog-handler";

/**
 * Dialog returns for backpack actions (drop, trash) and the gazette.
 */

function parseCount(player: Player, raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    player.sendTextBubble("Uh oh, thats not a valid number");
    return null;
  }
  return Number.parseInt(raw, 10);
}

registerDialog("gazzette_end", () => {});

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

  const isFish = getItem(itemId)?.type === ActionTypes.PETFISH;
  const dropAmount = isFish ? owned : count;

  player.removeItemInven(itemId, dropAmount);
  world.drop(player, x, y, itemId, dropAmount, { noSimilar: isFish });
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

  const isFish = getItem(itemId)?.type === ActionTypes.PETFISH;
  const trashAmount = isFish ? owned : count;

  player.removeItemInven(itemId, trashAmount);
  player.sendSfx("audio/trash.wav");
  player.sendClothesToWorld();
  player.variants.sendOnConsoleMessage(
    isFish ? `You trashed \`w${trashAmount} lb. ${getItem(itemId)?.name}` : `You trashed \`w${trashAmount} ${getItem(itemId)?.name}`,
  );
});
