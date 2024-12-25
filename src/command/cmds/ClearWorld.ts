import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { PacketTypes, TextPacket, Variant } from "growtopia.js";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export default class ClearWorld extends Command {
  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["clearworld"],
      description: "Clear a world",
      cooldown: 60 * 10,
      ratelimit: 1,
      category: "`oBasic",
      usage: "/clearworld",
      example: [],
      permission: [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    const world = this.peer.currentWorld();

    if (world?.data.owner) {
      if (world?.data.owner.id !== this.peer.data.id_user) return;
      const dialog = new DialogBuilder().addLabelWithIcon("Warning", "1432", "big").addTextBox("This will clear everything on your world, including your building. Are you sure?").endDialog("confirm_clearworld", "Nevermind", "Yes");

      this.peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }
  }
}
