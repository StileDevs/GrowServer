import { Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import type { DialogReturnType } from "../types";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "drop_end"
    };
  }

  public handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      drop_count: string;
      itemID: string;
    }>
  ): void {
    if (!/\d/.test(action.drop_count) || !/\d/.test(action.itemID)) {
      peer.send(Variant.from("OnTalkBubble", peer.data.netID, "Uh oh, thats not a valid number"));
      return;
    }
    const itemID = parseInt(action.itemID);
    const count = parseInt(action.drop_count);
    const itemExist = peer.data?.inventory?.items.find((i) => i.id === itemID);
    if (!itemExist || itemExist.amount <= 0) {
      peer.send(Variant.from("OnTalkBubble", peer.data.netID, "That item, seems not exist in your inventory"));
      return;
    }

    if (count > itemExist.amount) {
      peer.send(Variant.from("OnTalkBubble", peer.data.netID, "Really?"));
      return;
    }

    if (count <= 0) {
      peer.send(Variant.from("OnTalkBubble", peer.data.netID, "Nice try. You remind me of myself at that age."));
      return;
    }

    peer.drop(itemID, count);
    peer.removeItemInven(itemID, count);
    peer.inventory();
    peer.sendClothes();
  }
}
