import { TankPacket } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { TileData } from "@growserver/types";

export class TileUpdateData {
  private pos: number;
  private block: TileData;

  constructor(
    public base: Base,
    public peer: Peer,
    public tank: TankPacket,
    public world: World,
  ) {
    this.pos =
      (this.tank.data?.xPunch as number) +
      (this.tank.data?.yPunch as number) * this.world.data.width;
    this.block = this.world.data.blocks[this.pos];
  }
}
