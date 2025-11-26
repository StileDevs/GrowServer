import { TankPacket, Variant } from "growtopia.js";
import {
  BlockFlags,
  LockPermission,
  TankTypes,
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

export class DiceTile extends Tile {
  public extraType = TileExtraTypes.DICE;

  constructor(
    public base: Base,
    public world: World,
    public block: TileData,
  ) {
    super(base, world, block);
  }

  public async onPlaceForeground(
    peer: Peer,
    itemMeta: ItemDefinition,
  ): Promise<boolean> {
    if (!(await super.onPlaceForeground(peer, itemMeta))) return false;

    this.data.dice = {
      symbol:       0,
      lastRollTime: 0,
    };
    return true;
  }

  public async onPunch(peer: Peer): Promise<boolean> {
    const isPermitted = await this.world.hasTilePermission(
      peer.data.userID,
      this.data,
      LockPermission.BREAK,
    );
    if (!isPermitted) {
      // if it cant break the dice block, it will play the lock sound.
      super.onPunchFail(peer);
      if (!(this.block.flags & TileFlags.PUBLIC)) {
        return false;
      }
    } else {
      super.applyDamage(
        peer,
        6,
        new TankPacket({ punchRange: this.data.dice?.symbol }),
      );
    }

    const lastRollElapsed = Date.now() - this.data.dice!.lastRollTime;

    if (lastRollElapsed > 3000) {
      this.data.dice!.symbol = Math.floor(Math.random() * 5);
      this.data.dice!.lastRollTime = Date.now();

      const tankPkt = new TankPacket({
        type:       TankTypes.TILE_APPLY_DAMAGE,
        punchRange: this.data.dice!.symbol,
        netID:      peer.data.netID,
        xPunch:     this.data.x,
        yPunch:     this.data.y,
      });

      this.world.every((p) => {
        p.send(tankPkt);
      });
    }
    return true;
  }

  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);

    this.data.dice = undefined;
  }

  public async onWrench(peer: Peer): Promise<boolean> {
    if (!(await super.onWrench(peer))) return false;

    const baseDialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon("`wEdit Dice Block", this.data.fg, "big")
      .addCheckbox(
        "checkbox_public",
        "Usable by public",
        this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected",
      )
      .addCheckbox(
        "checkbox_silence",
        "Silenced",
        this.data.flags & TileFlags.SILENCED ? "selected" : "not_selected",
      )
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .endDialog("dice_edit", "Cancel", "Ok")
      .str();

    peer.send(Variant.from("OnDialogRequest", baseDialog));
    return true;
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);
    dataBuffer.grow(2);
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeU8(this.block.dice!.symbol!); // the actual role is offset by -1

    return;
  }
}
