import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "@growserver/utils";
import { Variant } from "growtopia.js";

export class Trash {
  constructor(
    public base: Base,
    public peer: Peer,
  ) {}

  public async execute(
    action: NonEmptyObject<Record<string, string>>,
  ): Promise<void> {
    const itemID = parseInt(action.itemID);

    // Prevent Trashing of Certain Items
    if (itemID === 18 || itemID === 32) {
      this.peer.send(
        Variant.from("OnTextOverlay", "You'd be sorry if you lost that."),
      );
      return;
    }

    const item = this.base.items.metadata.items.find((v) => v.id === itemID);

    const peerItem = this.peer.data.inventory.items.find(
      (v) => v.id === itemID,
    );

    if (!peerItem || peerItem.amount <= 0) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "That item doesn't exist in your inventory",
        ),
      );
      return;
    }

    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`Trash ${item?.name}`, item?.id || 0, "big")
      .addTextBox("How many to `4destroy`o?")
      .addInputBox("trash_count", "", 0, 5)
      .embed("itemID", itemID)
      .endDialog("trash_end", "Cancel", "OK")
      .str();
    this.peer.send(Variant.from("OnDialogRequest", dialog));
  }
}
