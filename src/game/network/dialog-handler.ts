import type { TextParser } from "../../utils/text-parser";
import { Collection } from "../../utils/collection";
import { logger } from "../../utils/logger";
import type { Player } from "../player";

export type DialogHandler = (player: Player, action: TextParser) => Promise<void> | void;

/** Dialog return handlers keyed by `dialog_name`. */
export const dialogs: Collection<string, DialogHandler> = new Collection();

/**
 * Registers a dialog return handler. Tile and feature modules call this at
 * import time; this module deliberately imports nothing from them so the
 * registry is initialized before any of them load.
 */
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
