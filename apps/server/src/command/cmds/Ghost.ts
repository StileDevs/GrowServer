import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";

export default class Ghost extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["ghost"],
      description: "Toggle ghost mode to to walk through blocks.",
      cooldown:    5,
      ratelimit:   1,
      category:    "`oBasic",
      usage:       "/ghost",
      example:     ["/ghost"],
      permission:  [ROLE.DEVELOPER],
    };
  }

  public async execute(): Promise<void> {
    this.peer.data.state.isGhost = !this.peer.data.state.isGhost;
    this.peer.data.state.canWalkInBlocks = this.peer.data.state.isGhost;

    if (this.peer.data.state.isGhost) {
      // TODO: Allow unlimited jump and downwards movement

      // Enable ghost mode: walk through blocks, double jump, and flying ability
      this.peer.data.state.mod |= 1 | (1 << 1) | (1 << 23); // WALK_IN_BLOCKS | DOUBLE_JUMP | HAVE_FLYING_PINEAPPLE
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`2Ghost mode enabled``. You can now walk through blocks!",
        ),
      );

      // Send semi-transparent white appearance (50% opacity)
      const world = this.peer.currentWorld();
      if (world) {
        world.every((p) => {
          p.send(
            Variant.from(
              { netID: this.peer.data.netID },
              "OnSetClothing",
              [
                this.peer.data.clothing.hair,
                this.peer.data.clothing.shirt,
                this.peer.data.clothing.pants,
              ],
              [
                this.peer.data.clothing.feet,
                this.peer.data.clothing.face,
                this.peer.data.clothing.hand,
              ],
              [
                this.peer.data.clothing.back,
                this.peer.data.clothing.mask,
                this.peer.data.clothing.necklace,
              ],
              0xffffff80, // White with 50% transparency
              [this.peer.data.clothing.ances, 0.0, 0.0],
            ),
          );
        });
      }
    } else {
      // Disable ghost mode
      this.peer.data.state.mod &= ~(1 | (1 << 1) | (1 << 23)); // Remove WALK_IN_BLOCKS | DOUBLE_JUMP | HAVE_FLYING_PINEAPPLE
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Ghost mode disabled``. You are back to normal.",
        ),
      );

      // Restore normal appearance
      this.peer.sendClothes();
    }

    this.peer.sendState();
  }
}
