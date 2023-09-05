import { Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { DialogReturnType } from "../types/dialog";
import { DialogBuilder } from "../utils/builders/DialogBuilder";

export default class extends Dialog {
  constructor() {
    super();
    this.config = {
      dialogName: "find_item"
    };
  }

  public handle(
    base: BaseServer,
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      find_item_name: string;
      seed_only: string;
    }>
  ): void {
    const isSeed = parseInt(action.seed_only) ? true : false;
    let dialog = new DialogBuilder()
      .defaultColor()
      .addQuickExit()
      .addLabelWithIcon("Find the item", "6016", "big")
      .addSpacer("small");

    const items = base.items.metadata.items.filter((v) =>
      v.name?.toLowerCase().includes(action.find_item_name.toLowerCase())
    );
    items.forEach((item) => {
      if (isSeed) {
        if (item.id! % 2 === 1)
          dialog.addButtonWithIcon(item.id!, item.id!, item.name!, "staticBlueFrame", item.id);
      } else {
        if (item.id! % 2 === 0)
          dialog.addButtonWithIcon(item.id!, item.id!, item.name!, "staticBlueFrame", item.id);
      }
    });

    // fix spacing dialog later
    // dialog.addSpacer("big");
    dialog.endDialog("find_item_end", "Cancel", "");

    // console.log(dialog.str());

    peer.send(Variant.from("OnDialogRequest", dialog.str()));
  }
}
