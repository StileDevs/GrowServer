import { ItemDefinition, Tank, TankPacket, Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { Block } from "../../types";

export class SetIconState {
  private pos: number;
  private block: Block;

  constructor(public base: Base, public peer: Peer, public tank: TankPacket, public world: World) {
    this.pos = (this.tank.data?.xPunch as number) + (this.tank.data?.yPunch as number) * this.world.data.width;
    this.block = this.world.data.blocks[this.pos];
  }

  public async execute() {
    this.tank.data!.state = this.peer.data?.rotatedLeft ? 16 : 0;

    this.peer.every((p) => {
      if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
        p.send(this.tank);
      }
    });
  }
}
