import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import { LockPermission, TileExtraTypes, TileFlags } from "../constants";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";

/**
 * Doors, portals and the main door. Extra data: label string + lock byte.
 */
export class DoorTile extends Tile {
  public extraType = TileExtraTypes.DOOR;

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    // doors are public by default
    this.data.flags |= TileFlags.TILEEXTRA | TileFlags.PUBLIC;
    this.data.door = { destination: "", id: "", label: "" };
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.door;
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(this.extraType);
    buffer.writeString(this.data.door?.label ?? "");
    // 0x8 = locked
    buffer.writeU8(this.data.flags & TileFlags.PUBLIC ? 0x0 : 0x8);
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!(await super.onWrench(player))) {
      await this.onPlaceFail(player);
      return false;
    }

    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;

    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id ?? 0, "big")
      .addInputBox("label", "Label", this.data.door?.label ?? "", 100)
      .addInputBox("target", "Destination", this.data.door?.destination ?? "", 24)
      .addSmallText("Enter a Destination in this format: `2WORLDNAME:ID``")
      .addSmallText("Leave `2WORLDNAME`` blank (:ID) to go to the door with `2ID`` in the `2Current World``.")
      .addInputBox("id", "ID", this.data.door?.id ?? "", 11)
      .addSmallText("Set a unique `2ID`` to target this door as a Destination from another!")
      .addCheckbox("checkbox_public", "Is open to public", this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .embed("itemID", itemMeta.id ?? 0)
      .endDialog("door_edit", "Cancel", "OK")
      .str();

    player.variants.sendOnDialogRequest(dialog);
    return true;
  }
}

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

  new DoorTile(world, block).tileUpdate();
  world.markDirty();
});
