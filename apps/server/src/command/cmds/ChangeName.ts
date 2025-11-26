import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";
import { World } from "../../core/World";
import { tileFrom, tileUpdateMultiple } from "../../world/tiles";

export default class ChangeName extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command: ["changename"],
      description:
        "Change your Display Name. You still can login with your current GrowID. NOTE: When using color, please terminate the color with 2 backticks ` ` ",
      cooldown:   5,
      ratelimit:  1,
      category:   "`oBasic",
      usage:      "/changename <new name>",
      example:    ["/changename MyNewName", "/changename `bC[@]nBeCoLored@Too``"],
      permission: [ROLE.DEVELOPER],
    };
  }

  public async execute(): Promise<void> {
    if (this.args.length) {
      await this.peer.updateDisplayName(this.args[0]);
      const currentWorld = this.peer.currentWorld();

      if (currentWorld) {
        await currentWorld.every((p) => {
          p.send(
            Variant.from(
              { netID: this.peer.data.netID },
              "OnNameChanged",
              this.peer.data.displayName,
            ),
          );
        });
      }
      await this.peer.saveToCache();
      await this.peer.saveToDatabase();
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          `Your Display name has been changed to ${this.peer.data.displayName}.`,
        ),
      );
    } else {
      this.peer.send(
        Variant.from("OnConsoleMessage", "`4Usage: /changename <new name>"),
      );
    }
  }
}
