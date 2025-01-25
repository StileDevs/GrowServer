import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

export class FindItem {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      find_item_name: string;
      seed_only: string;
    }>
  ) {}

  public async execute(): Promise<void> {
    const isSeed = parseInt(this.action.seed_only) ? true : false;
    const dialog = new DialogBuilder()
      .defaultColor()
      .addQuickExit()
      .addLabelWithIcon("Find the item", "6016", "big")
      .addSpacer("small");

    const items = this.base.items.metadata.items.filter((v) =>
      v.name?.toLowerCase().includes(this.action.find_item_name.toLowerCase())
    );
    items.forEach((item) => {
      const itemID = item.id || 0;
      const itemName = item.name || "";
      if (isSeed) {
        if (itemID % 2 === 1)
          dialog.addButtonWithIcon(
            itemID,
            itemID,
            itemName,
            "staticBlueFrame",
            item.id
          );
      } else {
        if (itemID % 2 === 0)
          dialog.addButtonWithIcon(
            itemID,
            itemID,
            itemName,
            "staticBlueFrame",
            item.id
          );
      }
    });

    dialog.endDialog("find_item_end", "Cancel", "");

    this.peer.send(Variant.from("OnDialogRequest", dialog.str()));
  }
}
