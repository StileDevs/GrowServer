import { Variant } from "growtopia.js";
import {
  BlockFlags,
  LockPermission,
  TileExtraTypes,
  TileFlags,
} from "@growserver/const";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { TileData } from "@growserver/types";
import { ExtendBuffer, DialogBuilder } from "@growserver/utils";
import { Tile } from "../Tile";
import { Peer } from "../../core/Peer";
import { ItemDefinition } from "grow-items";

export class SignTile extends Tile {
  public extraType = TileExtraTypes.SIGN;

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

    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.sign = { label: "" };

    return true;
  }

  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);
    this.data.sign = undefined;
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
      .addTextBox("What would you like to write on this sign?")
      .addInputBox("label", "", this.data.sign?.label, 100)
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .endDialog("sign_edit", "Cancel", "OK")
      .str();

    peer.send(Variant.from("OnDialogRequest", dialog));
    return true;
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);
    dataBuffer.grow(1 + 2 + (this.data.sign?.label?.length ?? 0) + 4);
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeString(this.data.sign?.label || "");
    dataBuffer.writeI32(-1);
  }
}
