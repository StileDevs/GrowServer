import { TankPacket } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";

export class ItemActiveObjectReq {
  private pos: number;

  constructor(
    public base: Base,
    public peer: Peer,
    public tank: TankPacket,
    public world: World
  ) {
    this.pos =
      (this.tank.data?.xPunch as number) +
      (this.tank.data?.yPunch as number) * this.world.data.width;
  }

  public async execute() {
    const dropped = this.world.data.dropped?.items.find(
      (i) => i.uid === this.tank.data?.info
    );
    if (dropped) this.world.collect(this.peer, dropped.uid);
  }
}
