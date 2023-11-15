import { TankPacket, TextPacket, Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { tileUpdate } from "../tanks/BlockPlacing";
import { DialogReturnType } from "../types/dialog";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { DataTypes } from "../utils/enums/DataTypes";
import { TankTypes } from "../utils/enums/TankTypes";

export default class extends Dialog {
  constructor() {
    super();
    this.config = {
      dialogName: "sign_edit"
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
    }>
  ): void {
    const world = peer.hasWorld(peer.data?.world!);
    const pos = parseInt(action.tilex) + parseInt(action.tiley) * world?.data.width!;
    const block = world?.data.blocks![pos]!;
    const itemMeta = base.items.metadata.items.find((i) => i.id === parseInt(action.itemID));

    if (world?.data.owner) {
      if (world.data.owner.id !== peer.data?.id_user) return;
    }

    block.sign!.label = action.label || "";

    tileUpdate(base, peer, itemMeta?.type!, block, world!);
  }
}
