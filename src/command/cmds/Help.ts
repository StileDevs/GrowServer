import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { PacketTypes, TextPacket, Variant } from "growtopia.js";
import { CommandMap } from ".";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export class Help extends Command {
  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      description: "Shows every available commands",
      cooldown: 5,
      ratelimit: 5,
      category: "Basic",
      usage: "/help <command_name?>",
      example: ["/help", "/help ping"],
      permission: [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    if (this.args.length > 0) {
      let Class = CommandMap[this.args[0]];

      if (!CommandMap[this.args[0]]) return this.peer.send(Variant.from("OnConsoleMessage", "It seems that commands doesn't exist."));
      const cmd = new Class(this.base, this.peer, this.text, this.args);

      const dialog = new DialogBuilder()
        .defaultColor()
        .addLabelWithIcon(this.args[0] || "", "32", "small")
        .addSpacer("small")
        .addSmallText(`Description: ${cmd?.opt.description}`)
        .addSmallText(`Cooldown: ${cmd?.opt.cooldown}`)
        .addSmallText(`Ratelimit: ${cmd?.opt.ratelimit}`)
        .addSmallText(`Permissions: ${cmd?.opt.permission.length ? cmd.opt.permission : "None"}`)
        .addSmallText(`Usage: ${cmd?.opt.usage}`)
        .addSmallText(`Example: ${cmd?.opt.example.join(", ")}`)
        .endDialog("help_end", "", "Ok")
        .addQuickExit();
      return this.peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }

    const dialog = new DialogBuilder().defaultColor().addLabelWithIcon("Help", "32", "small").addSpacer("small");

    Object.entries(CommandMap).forEach((cmdArr) => {
      const Class = cmdArr[1];
      const cmd = new Class(this.base, this.peer, this.text, this.args);

      dialog.addLabelWithIcon(cmd.opt.usage, "482", "small");
    });

    dialog.endDialog("help_end", "", "Ok");
    dialog.addQuickExit();
    this.peer.send(Variant.from("OnDialogRequest", dialog.str()));
  }
}
