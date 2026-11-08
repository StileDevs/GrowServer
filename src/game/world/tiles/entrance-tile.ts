import { DialogBuilder } from "../../../utils/dialog-builder";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import type { World } from "../world";
import type { TileData } from "../types";
import { ActionTypes, TileFlags } from "../constants";

/**
 * Whether a player may change an entrance: the world owner, the owner of
 * the lock covering it, or a developer.
 */
export function canEditEntrance(world: World, player: Player, tile: TileData): boolean {
  if (player.isDeveloper) return true;
  const tileOwner = world.getTileOwnerPlayerId(tile);
  if (tileOwner !== undefined) return tileOwner === player.playerId;
  const worldOwner = world.getOwnerPlayerId();
  return worldOwner !== undefined && worldOwner === player.playerId;
}

/** Whether the entrance sits in a locked area or a world-locked world. */
export function isInLockedArea(world: World, tile: TileData): boolean {
  return tile.lockedBy !== undefined || world.getOwnerPlayerId() !== undefined;
}

/** The "nothing to edit here" dialog of entrances outside a locked area. */
export function unlockedEntranceDialog(tile: TileData, name: string, itemId: number, dialogName: string): string {
  return new DialogBuilder()
    .defaultColor("`o")
    .addLabelWithIcon(`\`wEdit ${name}\`\``, itemId, "big")
    .addTextBox("This object has additional properties to edit if in a locked area.")
    .embed("tilex", tile.x)
    .embed("tiley", tile.y)
    .endDialog(dialogName, "Cancel", "OK")
    .str();
}

/**
 * Entrances (House Entrance and friends): a door-like block the client lets
 * through for the owner and admins of the lock covering it. No extra data;
 * "Allow anyone to enter" is the tile's PUBLIC flag.
 */
export class EntranceTile extends Tile {
  public override async onWrench(player: Player): Promise<boolean> {
    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;

    if (!canEditEntrance(this.world, player, this.data)) {
      await this.onPlaceFail(player);
      return false;
    }

    if (!isInLockedArea(this.world, this.data)) {
      player.variants.sendOnDialogRequest(unlockedEntranceDialog(this.data, itemMeta.name ?? "Entrance", itemMeta.id ?? 0, "entrance_edit"));
      return true;
    }

    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id ?? 0, "big")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .addCheckbox("checkbox_public", "Allow anyone to enter", this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected")
      .endDialog("entrance_edit", "Cancel", "OK")
      .str();

    player.variants.sendOnDialogRequest(dialog);
    return true;
  }
}

registerDialog("entrance_edit", (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  if (getItem(block.fg)?.type !== ActionTypes.GATEWAY) return;
  if (!canEditEntrance(world, player, block) || !isInLockedArea(world, block)) return;
  if (!action.contains("checkbox_public")) return;

  const wasPublic = (block.flags & TileFlags.PUBLIC) !== 0;
  const isPublic = action.get("checkbox_public") === "1";
  if (wasPublic === isPublic) return;

  if (isPublic) block.flags |= TileFlags.PUBLIC;
  else block.flags &= ~TileFlags.PUBLIC;

  new EntranceTile(world, block).tileUpdate();
  world.markDirty();
});
