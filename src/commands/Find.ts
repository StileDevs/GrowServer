import { TextPacket, Variant } from "growtopia.js";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { Role } from "../utils/Constants";
import { DataTypes } from "../utils/enums/DataTypes";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "find",
      description: "Find some items",
      cooldown: 5,
      ratelimit: 5,
      category: "Basic",
      usage: "/find <item_name?>",
      example: ["/find", "/find dirt"],
      permission: [Role.BASIC, Role.SUPPORTER, Role.DEVELOPER]
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    const dialog = new DialogBuilder().defaultColor().addLabelWithIcon("Find the item", "6016", "big").addCheckbox("seed_only", "Only seed", "not_selected").addInputBox("find_item_name", "", "", 30).addQuickExit().endDialog("find_item", "Cancel", "Find").str();

    if (args.length) {
      const findItemName = args.join(" ");
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

      peer.send(Variant.from("OnDialogRequest", dialog.str()));
      return;
    }

    peer.send(Variant.from("OnDialogRequest", dialog));
  }
}
