import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant, TextPacket, PacketTypes } from "growtopia.js";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export default class Sdb extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[]
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["sdb"],
      description: "Send a global message to everyone via a dialog box",
      cooldown:    5,
      ratelimit:   1,
      category:    "`bDev",
      usage:       "/sdb <message>",
      example:     ["/sdb Hello everyone!"],
      permission:  [ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    if (!this.args.length)
      return this.peer.send(Variant.from("Message is required."));

    const message = this.args.join(" ");
    const senderName = this.peer.name;
    const world = this.peer.currentWorld();
    const jammed = world?.data.jammers?.find((v) => v.type === "signal")?.enabled;

    // Dialog box creation
    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("Super Duper Broadcast", "2480", "big")
      .addSpacer("small")
      .addSmallText(`\`oMessage from: \`$${senderName}`);

    // If no jammer, show the world name
    if (!jammed) {
      dialog.addSmallText(`\`oWorld: \`o${this.peer.data.world}`);
    } else {
      dialog.addSmallText("`4JAMMED`");
    }

    dialog
      .addSpacer("small")
      .addSmallText(`\`5${message}`)
      .addQuickExit()
      .endDialog("ok", "Close", "");

    // Send dialog box and play beep sound to all players
    this.peer.every((player) => {
      player.send(
        Variant.from("OnDialogRequest", dialog.str()),
        TextPacket.from(
          PacketTypes.ACTION,
          "action|play_sfx",
          `file|audio/beep.wav`,
          `delayMS|0`
        )
      );
    });

    // Confirmation to sender
    this.peer.send(
      Variant.from("OnConsoleMessage", `\`2Super Duper Broadcast sent to all players.`)
    );
  }
}
