import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

export class Drop {
  constructor(public base: Base, public peer: Peer) {}

  public async execute(action: NonEmptyObject<{ itemID: string }>): Promise<void> {
    const itemID = parseInt(action.itemID);
    const item = this.base.items.metadata.items.find((v) => v.id === itemID);

    const peerItem = this.peer.data.inventory.items.find((v) => v.id === itemID);
    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`Drop ${item?.name}`, item?.id || 0, "big")
      .addTextBox("How many to drop?")
      .addInputBox("drop_count", "", peerItem?.amount, 5)
      .embed("itemID", itemID)
      .endDialog("drop_end", "Cancel", "OK")
      .str();
    this.peer.send(Variant.from("OnDialogRequest", dialog));
  }
}
