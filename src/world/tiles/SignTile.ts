import { ItemDefinition, Variant } from "growtopia.js";
import { BlockFlags, LockPermission, TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { TileData } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export class SignTile extends Tile {
  public extraType = TileExtraTypes.SIGN;

  constructor(
    public base: Base,
    public world: World,
    public data: TileData
  ) {
    super(base, world, data);
  }

  public async onPlaceForeground(peer: Peer, itemMeta: ItemDefinition): Promise<void> {
    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.sign = { label: "" };
    super.onPlaceForeground(peer, itemMeta);
  }

  public async onDestroy(peer: Peer): Promise<void> {
    this.data.sign = undefined;
    super.onDestroy(peer);
  }

  public async onWrench(peer: Peer): Promise<void> {
    const itemMeta = this.base.items.metadata.items[this.data.fg];
    if (this.world.hasTilePermission(peer.data.userID, this.data, LockPermission.BUILD && (itemMeta.flags! & BlockFlags.WRENCHABLE))) {
      const dialog = new DialogBuilder()
        .defaultColor()
        .addLabelWithIcon(
          `\`wEdit ${itemMeta.name}\`\``,
          itemMeta.id as number,
          "big"
        )
        .addTextBox("What would you like to write on this sign?")
        .addInputBox("label", "", this.data.sign?.label, 100)
        .embed("tilex", this.data.x)
        .embed("tiley", this.data.y)
        .embed("itemID", itemMeta.id)
        .endDialog("sign_edit", "Cancel", "OK")
        .str();

      peer.send(Variant.from("OnDialogRequest", dialog));
    }
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    super.serialize(dataBuffer);
    dataBuffer.grow(1 + 2 + (this.data.sign?.label?.length ?? 0) + 4);
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeString(this.data.sign?.label || "");
    dataBuffer.writeI32(-1);
  }

}
