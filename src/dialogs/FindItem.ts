import { Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import type { DialogReturnType } from "../types";
import { DialogBuilder } from "../utils/builders/DialogBuilder.js";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "find_item"
    };
  }

  public handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      find_item_name: string;
      seed_only: string;
    }>
  ): void {
    const isSeed = parseInt(action.seed_only) ? true : false;
    const dialog = new DialogBuilder().defaultColor().addQuickExit().addLabelWithIcon("Find the item", "6016", "big").addSpacer("small");

    const items = this.base.items.metadata.items.filter((v) => v.name?.value.toLowerCase().includes(action.find_item_name.toLowerCase()));
    items.forEach((item) => {
      const itemID = item.id || 0;
      const itemName = item.name?.value || "";
      if (isSeed) {
        if (itemID % 2 === 1) dialog.addButtonWithIcon(itemID, itemID, itemName, "staticBlueFrame", item.id);
      } else {
        if (itemID % 2 === 0) dialog.addButtonWithIcon(itemID, itemID, itemName, "staticBlueFrame", item.id);
      }
    });

    // fix spacing dialog later
    // dialog.addSpacer("big");
    dialog.endDialog("find_item_end", "Cancel", "");

    // console.log(dialog.str());

    peer.send(Variant.from("OnDialogRequest", dialog.str()));
  }
}
