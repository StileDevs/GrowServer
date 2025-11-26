import { Command } from "../../Command";
import { Base } from "../../../core/Base";
import { Peer } from "../../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";
export default class Shrug extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["shrug", "idk"],
      description: "shrug",
      cooldown:    0,
      ratelimit:   1,
      category:    "Emote",
      usage:       "/idk",
      example:     ["/shrug"],
      permission:  [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER],
    };
  }
  public async execute(): Promise<void> {
    const world = this.peer.currentWorld();
    const varlist = Variant.from(
      { netID: this.peer.data.netID },
      "OnAction",
      this.opt.usage,
    );

    if (world) {
      world.every((p) => {
        p.send(varlist);
      });
    }
  }
}
