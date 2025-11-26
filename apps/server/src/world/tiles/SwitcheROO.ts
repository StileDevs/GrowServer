import { TankPacket, Variant } from "growtopia.js";
import {
  ActionTypes,
  BlockFlags,
  LockPermission,
  TileFlags,
} from "@growserver/const";
import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "@growserver/types";
import { ExtendBuffer, DialogBuilder } from "@growserver/utils";
import { Tile } from "../Tile";

export class SwitcheROO extends Tile {
  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
  }

  public async onPunch(peer: Peer): Promise<boolean> {
    if (
      await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BREAK,
      )
    ) {
      // default punch behaviour, but with an exception
      this.data.flags ^= TileFlags.OPEN;
    } else {
      if (this.data.flags & TileFlags.PUBLIC) {
        this.data.flags ^= TileFlags.OPEN;
        this.applyDamage(peer, 0);
      }
    }

    return super.onPunch(peer);
  }

  public async onWrench(peer: Peer): Promise<boolean> {
    const itemMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    )!;
    if (
      await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BUILD && itemMeta.flags! & BlockFlags.WRENCHABLE,
      )
    ) {
      const dialog = new DialogBuilder()
        .defaultColor()
        .addLabelWithIcon(
          `\`wEdit ${itemMeta.name}\`\``,
          itemMeta.id as number,
          "big",
        )
        .addCheckbox(
          "checkbox_public",
          "Usable by public",
          this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected",
        )
        .embed("tilex", this.data.x)
        .embed("tiley", this.data.y) // i dont think this is included in the official one, but not very sure on it too.
        .endDialog("switcheroo_edit", "Cancel", "OK")
        .str();

      peer.send(Variant.from("OnDialogRequest", dialog));
      return true;
    }
    return false;
  }
}
