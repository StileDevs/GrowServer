import { Action } from "../abstracts/Action";
import { Peer } from "../structures/Peer";
import { BaseServer } from "../structures/BaseServer";
import { ActionType } from "../types/action";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

export default class extends Action {
  constructor() {
    super();
    this.config = {
      eventName: "trash"
    };
  }

  public handle(
    base: BaseServer,
    peer: Peer,
    action: ActionType<{ action: string; itemID: string }>
  ): void {
    const itemID = parseInt(action.itemID);
    const item = base.items.metadata.items.find((v) => v.id === itemID);
    const peerItem = peer.data?.inventory?.items.find((v) => v.id === itemID);

    let dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`\`4Trash\`\` ${item?.name}`, item?.id!, "big")
      .addTextBox(`How many to \`4destroy\`\`? (you have ${peerItem?.amount})`)
      .addInputBox("trash_count", "", peerItem?.amount, 5)
      .embed("itemID", itemID)
      .endDialog("trash_end", "Cancel", "OK")
      .str();

    peer.send(Variant.from("OnDialogRequest", dialog));
  }
}
