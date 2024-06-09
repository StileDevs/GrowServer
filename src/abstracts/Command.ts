import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import type { CommandOptions } from "../types";

export abstract class Command {
  public opt: CommandOptions;
  public base: BaseServer;

  constructor(base: BaseServer) {
    this.base = base;
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
