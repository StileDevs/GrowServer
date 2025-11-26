import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";

export default class Warp extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["warp"],
      description: "Warp to another world or door.",
      cooldown:    5,
      ratelimit:   1,
      category:    "`oBasic",
      usage:       "/warp <world name:door id>",
      example:     ["/warp START", "/warp MYWORLD:SPAWN", "/warp :MAINDOOR"],
      permission:  [ROLE.SUPPORTER, ROLE.DEVELOPER],
    };
  }

  public async execute(): Promise<void> {
    if (!this.args.length) {
      this.peer.send(
        Variant.from("OnConsoleMessage", "`4Usage: /warp <world name:door id>"),
      );
      return;
    }

    const destination = this.args[0];
    const worldDes = destination.split(":") as string[];

    if (!worldDes[0]) worldDes[0] = this.peer.data.world;

    const worldName = worldDes[0].toUpperCase();
    const doorId = worldDes[1];

    if (worldName.length <= 0) {
      this.peer.send(
        Variant.from("OnConsoleMessage", "`4That world name is empty."),
      );
      return;
    }

    if (worldName.match(/\W+|_|EXIT/gi)) {
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4That world name contains invalid characters.",
        ),
      );
      return;
    }

    if (worldName === "EXIT") {
      this.peer.send(
        Variant.from("OnConsoleMessage", "`4You cannot warp to EXIT."),
      );
      return;
    }

    if (worldName === this.peer.data.world && doorId) {
      const currentWorld = this.peer.currentWorld();
      const door =
        currentWorld?.data.blocks?.find(
          (b) => b.door && b.door.id === doorId,
        ) || currentWorld?.data.blocks?.find((b) => b.fg === 6);

      if (!door) {
        this.peer.send(
          Variant.from(
            "OnConsoleMessage",
            "`4Door not found in current world.",
          ),
        );
        return;
      }

      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          `Warping to door \`2${doorId}\`\` in current world...`,
        ),
      );

      const doorX = (door.x || 0) * 32;
      const doorY = (door.y || 0) * 32;

      this.peer.data.x = doorX;
      this.peer.data.y = doorY;

      this.peer.send(Variant.from("OnZoomCamera", [10000], 1000));

      if (currentWorld) {
        currentWorld.every((p) => {
          p.send(
            Variant.from(
              { netID: this.peer.data?.netID },
              "OnSetFreezeState",
              0,
            ),
            Variant.from({ netID: this.peer.data?.netID }, "OnSetPos", [
              doorX,
              doorY,
            ]),
            Variant.from(
              { netID: this.peer.data?.netID },
              "OnPlayPositioned",
              "audio/door_open.wav",
            ),
          );
        });
      }
    } else {
      if (doorId) {
        this.peer.send(
          Variant.from(
            "OnConsoleMessage",
            `Warping to \`2${worldName}:${doorId}\`\`...`,
          ),
        );
      } else {
        this.peer.send(
          Variant.from("OnConsoleMessage", `Warping to \`2${worldName}\`\`...`),
        );
      }

      setTimeout(async () => {
        const world = this.base.cache.worlds.get(worldName);
        const door =
          world?.blocks?.find((b) => b.door && b.door.id === doorId) ||
          world?.blocks?.find((b) => b.fg === 6);

        this.peer.enterWorld(worldName, door?.x, door?.y);
      }, 200);
    }
  }
}
