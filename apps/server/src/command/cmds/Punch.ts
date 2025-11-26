import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";

export default class PunchID extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["pid", "punchid"],
      description: "Change your Punch ID",
      cooldown:    1,
      ratelimit:   1,
      category:    "`bDev",
      usage:       "/pid <new_id>",
      example:     ["/pid 1234"],
      permission:  [ROLE.DEVELOPER],
    };
  }

  public async execute(): Promise<void> {
    const newPunchID = this.args[0];
    if (!newPunchID || isNaN(Number(newPunchID))) {
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Usage: /pid <new_id> (must be a number)",
        ),
      );
      return;
    }

    this.peer.customPunchID = Number(newPunchID);

    this.peer.send(
      Variant.from(
        "OnConsoleMessage",
        `\`2Your Punch ID has been changed to: ${newPunchID}`,
      ),
    );
    this.peer.sendState(Number(newPunchID));
  }
}
