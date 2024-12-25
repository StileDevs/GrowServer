import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant } from "growtopia.js";

export default class SaveServer extends Command {
  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["saveserver", "save"],
      description: "Save the server into database",
      cooldown: 5,
      ratelimit: 1,
      category: "`bDev",
      usage: "/saveserver",
      example: ["/saveserver"],
      permission: [ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    this.peer.send(Variant.from("OnConsoleMessage", "Saving all worlds & players..."));

    // Use the existing base instance instead of creating a new one
    await this.base.saveAll(false);

    this.peer.send(Variant.from("OnConsoleMessage", "Successfully saved all worlds & players"));
  }
}
