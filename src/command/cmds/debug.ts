import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { DebugAction } from "../../network/actions/DebugAction";

export default class Debug extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[]
  ) {
    super(base, peer, text, args);
    this.opt = {
      command: ["debug"],
      description: "Open the developer debug menu",
      cooldown: 5,
      ratelimit: 1,
      category: "`bDev",
      usage: "/debug",
      example: ["/debug"],
      permission: [ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    await new DebugAction(this.base, this.peer, {}).execute();
  }
}

export { Debug as DebugCommand };
