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
    action: DialogReturnType<{ action: string; dialog_name: string; find_item_name: string }>
  ): void {
    let dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("Find the item", "6016", "big")
      .addInputBox("find_item_name", "", action.find_item_name, 30)
      .addSpacer("small");

    const items = base.items.metadata.items.filter((v) =>
      v.name?.toLowerCase().includes(action.find_item_name.toLowerCase())
    );
    items.forEach((item) => {
      if (item.id! % 2 === 0) dialog.addButtonWithIcon(item.id!, item.id!, item.name!);
    });

    // fix spacing dialog later
    // dialog.addSpacer("big");
    dialog.endDialog("find_item_end", "Cancel", "");
    dialog.addQuickExit();

    // console.log(dialog.str());

    peer.send(Variant.from("OnDialogRequest", dialog.str()));
  }
}
