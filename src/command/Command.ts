import { Base } from "../core/Base.js";
import { Peer } from "../core/Peer.js";
import type { CommandOptions } from "../types/commands";

export class Command {
  public opt: CommandOptions;

  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    this.opt = {
      description: "",
      cooldown: 1,
      ratelimit: 1,
      category: "",
      usage: "",
      example: [],
      permission: []
    };
  }

  public async execute(): Promise<void> {}
}
