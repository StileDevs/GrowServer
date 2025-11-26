import { ItemDefinition } from "grow-items";
import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "@growserver/types";
import { ExtendBuffer, DialogBuilder } from "@growserver/utils";
import { Tile } from "../Tile";
import {
  ActionTypes,
  BlockFlags,
  LockPermission,
  ROLE,
  TileExtraTypes,
} from "@growserver/const";
import { Variant } from "growtopia.js";

export class DisplayBlockTile extends Tile {
  public extraType = TileExtraTypes.DISPLAY_BLOCK;

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
    if (!(await super.onPlaceForeground(peer, itemMeta))) {
      return false;
    }

    this.data.displayBlock = { displayedItem: 0 };

    return true;
  }

  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);

    if (this.data.displayBlock!.displayedItem) {
      const itemMeta = this.base.items.metadata.items.get(
        this.data.displayBlock!.displayedItem.toString(),
      );

      // TODO: add some item animation going to the player
      peer.addItemInven(this.data.displayBlock!.displayedItem);
      peer.sendConsoleMessage(`You picked up 1 ${itemMeta!.name!}`);
      peer.sendTextBubble(`You picked up 1 ${itemMeta!.name!}`, true);
    }
  }

  public async onPunch(peer: Peer): Promise<boolean> {
    if (this.data.displayBlock!.displayedItem) {
      if (
        await this.world.hasTilePermission(
          peer.data.userID,
          this.data,
          LockPermission.BREAK,
        )
      ) {
        const ownerUID = this.world.getTileOwnerUID(this.data);

        if (
          ownerUID &&
          ownerUID != peer.data.userID &&
          this.data.displayBlock!.displayedItem &&
          peer.data.role != ROLE.DEVELOPER
        ) {
          peer.sendTextBubble("Only the block's owner can break it!", true);
          return false;
        }
      } else {
        return await super.onPunch(peer);
      }

      if (!peer.canAddItemToInv(this.block.displayBlock!.displayedItem!)) {
        peer.sendTextBubble(
          "You don't have enough space in your backpack! Free some and try again.",
          true,
        );
        return false;
      }
    }
    return await super.onPunch(peer);
  }

  public async onPlaceBackground(
    peer: Peer,
    itemMeta: ItemDefinition,
  ): Promise<boolean> {
    return this.tryDisplayItem(peer, itemMeta);
  }

  public async onItemPlace(peer: Peer, item: ItemDefinition): Promise<boolean> {
    return this.tryDisplayItem(peer, item);
  }

  public async onWrench(peer: Peer): Promise<boolean> {
    if (!(await super.onWrench(peer))) return false;

    const baseDialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon("`wDisplay Block``", this.data.fg, "big")
      .addSpacer("small")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y);

    if (!this.data.displayBlock?.displayedItem) {
      baseDialog
        .addTextBox(
          "The Display Block is empty. Use an item on it to display the item!",
        )
        .endDialog("displayblock_edit", "Okay", "");

      peer.send(Variant.from("OnDialogRequest", baseDialog.str()));
      return true;
    }

    const itemMeta = this.base.items.metadata.items.get(
      this.data.displayBlock?.displayedItem.toString(),
    )!;
    const owner = this.world.getTileOwnerUID(this.data);

    baseDialog.addTextBox(`A ${itemMeta.name} is on display here.`);

    if (owner == undefined || owner == peer.data.userID) {
      baseDialog.endDialog("displayblock_edit", "Leave it", "Pick it up");
    } else {
      baseDialog.endDialog("displayblock_edit", "Okay", "");
    }

    peer.send(Variant.from("OnDialogRequest", baseDialog.str()));
    return true;
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);
    dataBuffer.grow(5);
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeU32(this.data.displayBlock!.displayedItem);
  }

  // some helper function to avoid writing this multiple time
  private async tryDisplayItem(
    peer: Peer,
    item: ItemDefinition,
  ): Promise<boolean> {
    const ownerUID = this.world.getTileOwnerUID(this.data);

    if (ownerUID == undefined) {
      peer.sendTextBubble(
        "This area must be locked to put your item on display!",
        false,
      );
      return false;
    } else if (ownerUID != peer.data.userID) {
      peer.sendTextBubble(
        "Only the block's owner can place items in it.",
        false,
      );
      return false;
    } else if (this.data.displayBlock!.displayedItem) {
      peer.sendTextBubble("Remove what's in there first!", false);
      return false;
    } else if (item.type == ActionTypes.LOCK || item.id == this.data.fg) {
      peer.sendTextBubble(
        "Sorry, no displaying Display Blocks or Locks",
        false,
      );
      return false;
    } else if (item.id == 858 /* Screen door */) {
      peer.sendTextBubble("Don't be a scammer.", false);
      return false;
    } else if (item.flags! & BlockFlags.UNTRADEABLE) {
      peer.sendTextBubble("You can't display untradeable items.", false);
      return false;
    }

    this.world.every((p) => {
      p.sendOnPlayPositioned("audio/blorb.wav", { netID: peer.data.netID });
      this.tileUpdate(p);
    });
    peer.removeItemInven(item.id!, 1);
    this.data.displayBlock!.displayedItem = item.id!;
    return true;
  }
}
