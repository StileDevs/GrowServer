import { TankPacket, TextPacket, Variant } from "growsockets";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { DialogReturnType } from "../types/dialog";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { DataTypes } from "../utils/enums/DataTypes";
import { TankTypes } from "../utils/enums/TankTypes";

export default class extends Dialog {
  constructor() {
    super();
    this.config = {
      dialogName: "trash_end"
    };
  }

  public handle(
    base: BaseServer,
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      trash_count: string;
      itemID: string;
    }>
  ): void {
    const itemID = parseInt(action.itemID);
    let invenItem = peer.data.inventory?.items.find((item) => item.id === itemID)!;
    if (!/\d/.test(action.trash_count)) return;

    const count = parseInt(action.trash_count);
    invenItem.amount = invenItem.amount - count;

    // Check if inventory amount is empty, then delete it.
    if (invenItem.amount <= 0) {
      peer.data.inventory!.items! = peer.data.inventory?.items.filter((i) => i.amount !== 0)!;
    }

    peer.saveToCache();
    peer.inventory();
  }
}
