import { Base } from "../core/Base";
import { Peer } from "../core/Peer";
import type { CommandOptions } from "../types/commands";

export class Command {
  public opt: CommandOptions;

  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[]
  ) {
    this.opt = {
      command:     [],
      description: "",
      cooldown:    1,
      ratelimit:   1,
      category:    "",
      usage:       "",
      example:     [],
      permission:  []
    };
  }

  public async execute(): Promise<void> {}
}
