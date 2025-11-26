import { Variant } from "growtopia.js";
import {
  BlockFlags,
  LockPermission,
  TileExtraTypes,
  TileFlags,
} from "@growserver/const";
import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "@growserver/types";
import { ExtendBuffer, DialogBuilder } from "@growserver/utils";
import { Tile } from "../Tile";
import { ItemDefinition } from "grow-items";

export class DoorTile extends Tile {
  public extraType = TileExtraTypes.DOOR;

  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
  }

  public async onPlaceForeground(
    peer: Peer,
    itemMeta: ItemDefinition,
  ): Promise<boolean> {
    if (!(await super.onPlaceForeground(peer, itemMeta))) {
      return false;
    }

    // by default, it is public
    // in real growtopia server, they dont use this. But because im lazy, im gonna use TileFlags instead - Badewen
    this.data.flags |= TileFlags.TILEEXTRA | TileFlags.PUBLIC;
    this.data.door = {
      destination: "",
      id:          "",
      label:       "",
    };

    return true;
  }

  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);
    this.data.door = undefined;
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);
    const labelTotalSize = 2 + (this.data.door!.label ?? "").length;
    dataBuffer.grow(1 + labelTotalSize + 1);

    // using '!' because we are certain that it exists. Otherwise, crash.
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeString(this.data.door!.label ?? "");
    // 0x8 = Locked
    dataBuffer.writeU8(this.data.flags & TileFlags.PUBLIC ? 0x0 : 0x8);
  }

  public async onWrench(peer: Peer): Promise<boolean> {
    if (!(await super.onWrench(peer))) {
      this.onPlaceFail(peer);
      return false;
    }

    const itemMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    )!;
    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(
        `\`wEdit ${itemMeta.name}\`\``,
        itemMeta.id as number,
        "big",
      )
      .addInputBox("label", "Label", this.data.door?.label, 100)
      .addInputBox("target", "Destination", this.data.door?.destination, 24)
      .addSmallText("Enter a Destination in this format: `2WORLDNAME:ID``")
      .addSmallText(
        "Leave `2WORLDNAME`` blank (:ID) to go to the door with `2ID`` in the `2Current World``.",
      )
      .addInputBox("id", "ID", this.data.door?.id, 11)
      .addSmallText(
        "Set a unique `2ID`` to target this door as a Destination from another!",
      )
      // i dont think following the real growtopia who is using checkbox_locked is worh it lol
      .addCheckbox(
        "checkbox_public",
        "Is open to public",
        this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected",
      )
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .embed("itemID", itemMeta.id)
      .endDialog("door_edit", "Cancel", "OK")
      .str();

    peer.send(Variant.from("OnDialogRequest", dialog));
    return true;
  }
}
