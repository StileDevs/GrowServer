import { TankPacket, TextPacket, Variant } from "growtopia.js";
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
      dialogName: "drop_end"
    };
  }

  public handle(
    base: BaseServer,
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      drop_count: string;
      itemID: string;
    }>
  ): void {
    if (!/\d/.test(action.drop_count) || !/\d/.test(action.itemID)) {
      return peer.send(
        Variant.from("OnTalkBubble", peer.data?.netID!, "Uh oh, thats not a valid number")
      );
    }
    const itemID = parseInt(action.itemID);
    const count = parseInt(action.drop_count);
    const itemExist = peer.data?.inventory?.items.find((i) => i.id === itemID);
    if (!itemExist || itemExist.amount <= 0) {
      return peer.send(
        Variant.from(
          "OnTalkBubble",
          peer.data?.netID!,
          "That item, seems not exist in your inventory"
        )
      );
    }

    if (count > itemExist.amount) {
      return peer.send(Variant.from("OnTalkBubble", peer.data?.netID!, "Really?"));
    }

    if (count <= 0) {
      return peer.send(
        Variant.from(
          "OnTalkBubble",
          peer.data?.netID!,
          "Nice try. You remind me of myself at that age."
        )
      );
    }

    peer.drop(itemID, count);
    peer.removeItemInven(itemID, count);
    peer.inventory();
    peer.sendClothes();
  }
}
