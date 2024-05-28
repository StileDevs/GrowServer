import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { CommandOptions } from "../types";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { Role } from "../utils/Constants";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "clearworld",
      description: "Clear a world",
      cooldown: 60 * 10,
      ratelimit: 1,
      category: "Basic",
      usage: "/clearworld",
      example: [],
      permission: [Role.BASIC, Role.SUPPORTER, Role.DEVELOPER]
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    const world = peer.hasWorld(peer.data.world);

    if (world?.data.owner) {
      if (world?.data.owner.id !== peer.data.id_user) return;
      const dialog = new DialogBuilder().addLabelWithIcon("Warning", "1432", "big").addTextBox("This will clear everything on your world, including your building. Are you sure?").endDialog("confirm_clearworld", "Nevermind", "Yes");

      peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }
  }
}
