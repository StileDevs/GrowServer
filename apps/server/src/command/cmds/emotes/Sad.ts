import { Command } from "../../Command";
import { Base } from "../../../core/Base";
import { Peer } from "../../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";
export default class Sad extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["sad"],
      description: "sad",
      cooldown:    0,
      ratelimit:   1,
      category:    "Emote",
      usage:       "/sad",
      example:     ["/sad"],
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
    const talkBubbleVarlist = Variant.from(
      "OnTalkBubble",
      this.peer.data.netID,
      "CP:0_PL:0_OID:_:(",
      0,
    );
    if (world) {
      world.every((p) => {
        p.send(varlist, talkBubbleVarlist);
      });
    }
  }
}
