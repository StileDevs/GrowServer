import { Base } from "../core/Base.js";
import { Peer } from "../core/Peer.js";
import type { CommandOptions } from "../types";

export abstract class Command {
  public opt: CommandOptions;

  constructor(public base: Base) {
    this.opt = {
      name: "",
      description: "",
      cooldown: 1,
      ratelimit: 1,
      category: "",
      usage: "",
      example: [],
      permission: []
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {}
}
