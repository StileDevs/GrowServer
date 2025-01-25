import { TankPacket, TextPacket, Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { Block } from "../../types";
import { PacketTypes } from "../../Constants";

export class TileActiveReq {
  private pos: number;
  private block: Block;

  constructor(
    public base: Base,
    public peer: Peer,
    public tank: TankPacket,
    public world: World
  ) {
    this.pos =
      (this.tank.data?.xPunch as number) +
      (this.tank.data?.yPunch as number) * this.world.data.width;
    this.block = this.world.data.blocks[this.pos];
  }

  public async execute() {
    if (this.peer.data.world === "EXIT") return;

    if (!this.block || !this.block.door) return;
    if (this.block.fg === 6) return this.peer.leaveWorld();

    const worldDes = this.block.door.destination?.split(":") as string[];
    if (!worldDes[0]) worldDes[0] = this.peer.data.world;

    const worldName = worldDes[0];
    const id = worldDes[1];

    if (worldName === this.peer.data.world) {
      let door = this.world.data.blocks.find((b) => b.door && b.door.id === id);

      if (!door) door = this.world.data.blocks.find((b) => b.fg === 6);

      const doorX = (door?.x || 0) * 32;
      const doorY = (door?.y || 0) * 32;

      this.peer.data.x = doorX;
      this.peer.data.y = doorY;

      this.peer.send(Variant.from("OnZoomCamera", [10000], 1000));

      this.peer.every((p) => {
        if (
          p.data?.world === this.peer.data?.world &&
          p.data?.world !== "EXIT"
        ) {
          p.send(
            Variant.from(
              { netID: this.peer.data?.netID },
              "OnSetFreezeState",
              0
            ),
            Variant.from(
              {
                netID: this.peer.data?.netID
              },
              "OnSetPos",
              [doorX, doorY]
            ),
            Variant.from(
              {
                netID: this.peer.data?.netID
              },
              "OnPlayPositioned",
              "audio/door_open.wav"
            )
          );
        }
      });
    } else {
      if (worldName === "EXIT") return this.peer.leaveWorld();
      const wrld = this.peer.currentWorld();

      let door = wrld?.data.blocks?.find((b) => b.door && b.door.id === id);
      if (!door) door = wrld?.data.blocks?.find((b) => b.fg === 6);

      this.world.data.playerCount = this.world.data.playerCount
        ? this.world.data.playerCount - 1
        : 0;

      this.peer.every((p) => {
        if (
          p.data?.netID !== this.peer.data.netID &&
          p.data?.world === this.peer.data.world &&
          p.data.world !== "EXIT"
        ) {
          p.send(
            Variant.from(
              "OnRemove",
              `netID|${this.peer.data.netID}`,
              `pId|${this.peer.data.id_user}`
            ),
            Variant.from(
              "OnConsoleMessage",
              `\`5<${this.peer.name}\`\` left, \`w${this.world.data.playerCount}\`\` others here\`5>\`\``
            ),
            Variant.from(
              "OnTalkBubble",
              this.peer.data.netID,
              `\`5<${this.peer.name}\`\` left, \`w${this.world.data.playerCount}\`\` others here\`5>\`\``
            ),
            TextPacket.from(
              PacketTypes.ACTION,
              "action|play_sfx",
              "file|audio/door_shut.wav",
              "delayMS|0"
            )
          );
        }
      });
      this.peer.enterWorld(worldName, door?.x, door?.y);
    }
  }
}
