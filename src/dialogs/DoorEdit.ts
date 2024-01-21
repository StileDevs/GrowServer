import { TankPacket, TextPacket, Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { tileUpdate } from "../tanks/BlockPlacing";
import { DialogReturnType } from "../types/dialog";
import { Block } from "../types/world";
import { World } from "../structures/World";

export default class extends Dialog {
  constructor() {
    super();
    this.config = {
      dialogName: "door_edit"
    };
  }

  public handle(
    base: BaseServer,
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      tilex: string;
      tiley: string;
      itemID: string;
      label?: string;
      target?: string;
      id?: string;
    }>
  ): void {
    const world = peer.hasWorld(peer.data.world);
    const pos = parseInt(action.tilex) + parseInt(action.tiley) * (world?.data.width || 100);
    const block = world?.data.blocks[pos] as Block;
    const itemMeta = base.items.metadata.items.find((i) => i.id === parseInt(action.itemID));

    if (world?.data.owner) {
      if (world?.data.owner.id !== peer.data?.id_user) return;
    }

    block.door = {
      label: action.label || "",
      destination: action.target?.toUpperCase() || "",
      id: action.id?.toUpperCase() || ""
    };

    tileUpdate(base, peer, itemMeta?.type || 0, block, world as World);
  }
}
