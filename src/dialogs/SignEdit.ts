import { TankPacket, TextPacket, Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import { Place } from "../tanks/Place.js";
import type { DialogReturnType, Block } from "../types";
import { World } from "../structures/World.js";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "sign_edit"
    };
  }

  public handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      tilex: string;
      tiley: string;
      itemID: string;
      label?: string;
    }>
  ): void {
    const world = peer.hasWorld(peer.data.world);
    const pos = parseInt(action.tilex) + parseInt(action.tiley) * (world?.data.width as number);
    const block = world?.data.blocks[pos] as Block;
    const itemMeta = this.base.items.metadata.items.find((i) => i.id === parseInt(action.itemID));

    if (world?.data.owner) {
      if (world.data.owner.id !== peer.data?.id_user) return;
    }

    block.sign = {
      label: action.label || ""
    };

    Place.tileUpdate(this.base, peer, itemMeta?.type || 0, block, world as World);
  }
}
