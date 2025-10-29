import { Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { type NonEmptyObject } from "type-fest";

export class JoinRequest {
  constructor(
    public base: Base,
    public peer: Peer
  ) {}

  public async execute(
    action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    const worldName = action.name || "";
    if (worldName.length <= 0) {
      this.peer.send(
        Variant.from("OnFailedToEnterWorld", 1),
        Variant.from("OnConsoleMessage", "That world name is uhh `9empty``")
      );
      return;
    }
    if (worldName.match(/\W+|_|EXIT/gi)) {
      this.peer.send(
        Variant.from("OnFailedToEnterWorld", 1),
        Variant.from(
          "OnConsoleMessage",
          "That world name is too `9special`` to be entered."
        )
      );
      return;
    }

    setTimeout(() => {
      this.peer.enterWorld(worldName.toUpperCase());
    }, 200);
  }
}
