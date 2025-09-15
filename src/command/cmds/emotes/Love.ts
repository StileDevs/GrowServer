import { Command } from "../../Command";
import { Base } from "../../../core/Base";
import { Peer } from "../../../core/Peer";
import { ROLE } from "../../../Constants";
import { Variant } from "growtopia.js";
export default class Love extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[]
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["love", "kiss"],
      description: "Love",
      cooldown:    0,
      ratelimit:   1,
      category:    "Emote",
      usage:       "/love",
      example:     ["/love"],
      permission:  [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }
  public async execute(): Promise<void> {
    this.peer.every((otherPeerInCache: Peer) => {
      if (
        otherPeerInCache.data.world === this.peer.data.world
      ) {
        otherPeerInCache.send(Variant.from(
          { netID: this.peer.data.netID },
          "OnAction",
          this.opt.usage
        ));
      }
    });
  }
}