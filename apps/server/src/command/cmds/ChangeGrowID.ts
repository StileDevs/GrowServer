import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant } from "growtopia.js";
import { tileFrom, tileUpdateMultiple } from "../../world/tiles";
import { World } from "../../core/World";

export default class ChangeGrowID extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[]
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["changegrowid", "changeid"],
      description: "Change your growid. Please remember your new GrowID before doing so, because you are going to have to use the new one to login.",
      cooldown:    5,
      ratelimit:   1,
      category:    "`oBasic",
      usage:       "/changegrowid <new growid>",
      example:     ["/changegrowid MyNewGrowID"],
      permission:  [ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    if (this.args.length) {
      this.peer.data.name = this.args[0];
      await this.peer.updateDisplayName();
      const currentWorld = this.peer.currentWorld();
      if (currentWorld) {
        await currentWorld.every((p)=>{
          p.send(Variant.from({netID: this.peer.data.netID},"OnNameChanged", this.peer.data.displayName));
        })
      }
      this.peer.send(Variant.from("OnConsoleMessage", `Your GrowID has been changed to ${this.peer.data.name}.`))
    }
    else {
      this.peer.send(Variant.from("OnConsoleMessage", "`4Usage: /changegrowid <new growid>"));
    }
  }
}
