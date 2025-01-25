import { TankPacket, Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { Block } from "../../types";
import { ActionTypes } from "../../Constants";

export class State {
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
    this.tank.data!.netID = this.peer.data.netID;

    this.peer.data.x = this.tank.data?.xPos;
    this.peer.data.y = this.tank.data?.yPos;
    this.peer.data.rotatedLeft = Boolean(
      (this.tank.data?.state as number) & 0x10
    );

    this.peer.saveToCache();
    this.peer.every((p) => {
      if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
        p.send(this.tank);
      }
    });

    this.onPlayerMove();
  }

  private async onPlayerMove() {
    if (
      (this.tank.data?.xPunch as number) > 0 ||
      (this.tank.data?.yPunch as number) > 0
    )
      return;
    if (this.block === undefined) return;

    const itemMeta =
      this.base.items.metadata.items[this.block.fg || this.block.bg];

    switch (itemMeta.type) {
      case ActionTypes.CHECKPOINT: {
        this.peer.send(
          Variant.from(
            { netID: this.peer.data.netID, delay: 0 },
            "SetRespawnPos",
            this.pos
          )
        );
        this.peer.data.lastCheckpoint = {
          x: Math.round((this.tank.data?.xPos as number) / 32),
          y: Math.round((this.tank.data?.yPos as number) / 32)
        };
        break;
      }

      case ActionTypes.FOREGROUND: {
        if (itemMeta.id === 3496 || itemMeta.id === 3270) {
          // Steam testing
        }
        break;
      }
    }
  }
}
