import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import { TileExtraTypes, TileFlags } from "../constants";

/**
 * Signs. Extra data: label string + i32 (-1).
 */
export class SignTile extends Tile {
  public extraType = TileExtraTypes.SIGN;

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.sign = { label: "" };
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.sign;
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
      .addTextBox("What would you like to write on this sign?")
      .addInputBox("label", "", this.data.sign?.label ?? "", 100)
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .endDialog("sign_edit", "Cancel", "OK")
      .str();

    player.variants.sendOnDialogRequest(dialog);
    return true;
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(this.extraType);
    buffer.writeString(this.data.sign?.label ?? "");
    buffer.writeI32(-1);
  }
}
