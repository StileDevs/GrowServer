import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { Variant } from "growtopia.js";

export class DropEnd {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      drop_count: string;
      itemID: string;
    }>
  ) {}

  public async execute(): Promise<void> {
    if (!/\d/.test(this.action.drop_count) || !/\d/.test(this.action.itemID)) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "Uh oh, thats not a valid number"
        )
      );
      return;
    }
    const itemID = parseInt(this.action.itemID);
    const count = parseInt(this.action.drop_count);
    const itemExist = this.peer.data?.inventory?.items.find(
      (i) => i.id === itemID
    );
    if (!itemExist || itemExist.amount <= 0) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "That item, seems not exist in your inventory"
        )
      );
      return;
    }

    if (count > itemExist.amount) {
      this.peer.send(
        Variant.from("OnTalkBubble", this.peer.data.netID, "Really?")
      );
      return;
    }

    if (count <= 0) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "Nice try. You remind me of myself at that age."
        )
      );
      return;
    }

    this.peer.drop(itemID, count);
    this.peer.removeItemInven(itemID, count);
    this.peer.inventory();
    this.peer.sendClothes();
  }
}
