import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant } from "growtopia.js";

export default class Ping extends Command {
  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["ping", "pong"],
      description: "Ping pong",
      cooldown: 5,
      ratelimit: 1,
      category: "`oBasic",
      usage: "/ping",
      example: ["/ping"],
      permission: [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    this.peer.send(Variant.from("OnConsoleMessage", "Pong :>"));
  }
}
