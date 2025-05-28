import { ItemDefinition, Variant } from "growtopia.js";
import { BlockFlags, LockPermission, TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export class DoorTile extends Tile {
  public extraType = TileExtraTypes.DOOR;

  constructor(
    public base: Base,
    public world: World,
    public data: TileData
  ) {
    super(base, world, data);
  }

  public async onPlaceForeground(peer: Peer, itemMeta: ItemDefinition): Promise<void> {
    super.onPlaceForeground(peer, itemMeta);

    // by default, it is public
    this.data.flags |= TileFlags.TILEEXTRA | TileFlags.PUBLIC;
    this.data.door = {
      destination: "",
      id:          "",
      label:       ""
    }
    console.log(this.data);
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    super.serialize(dataBuffer);
    const labelTotalSize = 2 + (this.data.door!.label ?? "").length;
    dataBuffer.grow(1 + labelTotalSize + 1);

    // using '!' because we are certain that it exists. Otherwise, crash.
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeString(this.data.door!.label ?? "");
    // first param send red text bubble locked/not (0x8/0x0)
    dataBuffer.writeU8((this.data.flags & TileFlags.PUBLIC) ? 0x0 : 0x8);
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
        .addInputBox("label", "Label", this.data.door?.label, 100)
        .addInputBox(
          "target",
          "Destination",
          this.data.door?.destination,
          24
        )
        .addSmallText("Enter a Destination in this format: `2WORLDNAME:ID``")
        .addSmallText(
          "Leave `2WORLDNAME`` blank (:ID) to go to the door with `2ID`` in the `2Current World``."
        )
        .addInputBox("id", "ID", this.data.door?.id, 11)
        .addSmallText(
          "Set a unique `2ID`` to target this door as a Destination from another!"
        )
        // i dont think following the real growtopia who is using checkbox_locked is worh it lol
        .addCheckbox("checkbox_public", "Is open to public", (this.data.flags & TileFlags.PUBLIC) ? "selected" : "not_selected")
        .embed("tilex", this.data.x)
        .embed("tiley", this.data.y)
        .embed("itemID", itemMeta.id)
        .endDialog("door_edit", "Cancel", "OK")
        .str();

      peer.send(Variant.from("OnDialogRequest", dialog));
    }
  }
}