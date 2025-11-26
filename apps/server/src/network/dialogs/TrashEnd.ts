import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { Variant, TextPacket, PacketTypes } from "growtopia.js";

export class TrashEnd {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      trash_count: string;
      itemID: string;
    }>,
  ) {}

  public async execute(): Promise<void> {
    if (
      !this.action.dialog_name ||
      !this.action.trash_count ||
      !this.action.itemID
    )
      return;
    if (!/\d/.test(this.action.trash_count) || !/\d/.test(this.action.itemID)) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "Uh oh, thats not a valid number",
        ),
      );
      return;
    }
    const itemID = parseInt(this.action.itemID);
    const count = parseInt(this.action.trash_count);
    const itemExist = this.peer.data?.inventory?.items.find(
      (i) => i.id === itemID,
    );
    if (!itemExist || itemExist.amount <= 0) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "That item, seems not exist in your inventory",
        ),
      );
      return;
    }

    if (count > itemExist.amount) {
      this.peer.send(
        Variant.from("OnTalkBubble", this.peer.data.netID, "Really?"),
      );
      return;
    }

    if (itemID === 18 || itemID === 32) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "Cannot trash this item.",
        ),
      );
      return;
    }

    if (count <= 0) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "Nice try. You remind me of myself at that age.",
        ),
      );
      return;
    }
    // Use the RemoveItemInven Method Instead of Direct Subtraction
    this.peer.removeItemInven(itemID, count);
    this.peer.send(
      TextPacket.from(
        PacketTypes.ACTION,
        "action|play_sfx",
        "file|audio/trash.wav",
        "delayMS|0",
      ),
    );
    const item = this.base.items.metadata.items.find((v) => v.id === itemID);
    //this.peer.inventory();
    this.peer.sendClothes();
    this.peer.send(
      Variant.from("OnConsoleMessage", `You trashed \`w${count} ${item?.name}`),
    );
  }
}
