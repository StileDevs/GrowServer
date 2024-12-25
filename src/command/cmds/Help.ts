import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant } from "growtopia.js";
import { CommandMap } from ".";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export default class Help extends Command {
  constructor(base: Base, peer: Peer, text: string, args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["help", "?"],
      description: "Shows available commands",
      cooldown: 5,
      ratelimit: 1,
      category: "`oBasic",
      usage: "/help",
      example: ["/help"],
      permission: [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }

  private getRoleLevel(role: string): number {
    const roleLevels = {
      [ROLE.BASIC]: 1,
      [ROLE.SUPPORTER]: 2,
      [ROLE.DEVELOPER]: 3
    };
    return roleLevels[role] || 0;
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
    const userRoleLevel = this.getRoleLevel(this.peer.data.role);

    // Filter and organize commands
    const commandsByCategory: Record<string, string[]> = {};

    Object.values(CommandMap).forEach((CommandClass) => {
      const cmd = new CommandClass(null, null, "", []);

      // Check if user has permission based on role hierarchy
      const hasPermission = cmd.opt.permission.some((role) => this.getRoleLevel(role) <= userRoleLevel);

      if (hasPermission) {
        const category = cmd.opt.category || "Uncategorized";
        if (!commandsByCategory[category]) {
          commandsByCategory[category] = [];
        }

        const commandString = `/${cmd.opt.command.join(", /")}`;
        // prevent any duplicates on commands
        if (!commandsByCategory[category].includes(commandString)) {
          commandsByCategory[category].push(commandString);
        }
      }
    });

    // Build output message
    let message = "Available Commands: ";

    Object.entries(commandsByCategory).forEach(([category, commands]) => {
      message += `${category}: ${commands.join(", ")} `;
    });

    this.peer.send(Variant.from("OnConsoleMessage", message));
  }
}
