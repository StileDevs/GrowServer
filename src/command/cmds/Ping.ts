import { Command } from "../Command.js";
import { Base } from "../../core/Base.js";
import { Peer } from "../../core/Peer.js";
import { ROLE } from "../../Constants.js";
import { Variant } from "growtopia.js";

export class Ping extends Command {
  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      description: "Ping pong",
      cooldown: 5,
      ratelimit: 1,
      category: "Basic",
      usage: "/ping",
      example: ["/ping"],
      permission: [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    this.peer.send(Variant.from("OnConsoleMessage", "Pong :>"));
  }
}
