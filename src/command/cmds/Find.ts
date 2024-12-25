import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant } from "growtopia.js";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export default class Find extends Command {
  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["find"],
      description: "Find some items",
      cooldown: 5,
      ratelimit: 5,
      category: "`oBasic",
      usage: "/find <item_name?>",
      example: ["/find", "/find dirt"],
      permission: [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    const dialog = new DialogBuilder().defaultColor().addLabelWithIcon("Find the item", "6016", "big").addCheckbox("seed_only", "Only seed", "not_selected").addInputBox("find_item_name", "", "", 30).addQuickExit().endDialog("find_item", "Cancel", "Find").str();

    if (this.args.length) {
      const findItemName = this.args.join(" ");
      const isSeed = false;
      const dialog = new DialogBuilder().defaultColor().addQuickExit().addLabelWithIcon("Find the item", "6016", "big").addSpacer("small");

      const items = this.base.items.metadata.items.filter((v) => v.name?.toLowerCase().includes(findItemName.toLowerCase()));
      items.forEach((item) => {
        const itemID = item.id || 0;
        const itemName = item.name || "";
        if (isSeed) {
          if (itemID % 2 === 1) dialog.addButtonWithIcon(itemID, itemID, itemName, "staticBlueFrame", item.id);
        } else {
          if (itemID % 2 === 0) dialog.addButtonWithIcon(itemID, itemID, itemName, "staticBlueFrame", item.id);
        }
      });

      dialog.endDialog("find_item_end", "Cancel", "");

      this.peer.send(Variant.from("OnDialogRequest", dialog.str()));
      return;
    }

    this.peer.send(Variant.from("OnDialogRequest", dialog));
  }
}
