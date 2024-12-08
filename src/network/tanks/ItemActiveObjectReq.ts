import { ItemDefinition, Tank, TankPacket, Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { Block } from "../../types";

export class ItemActiveObjectReq {
  private pos: number;
  private block: Block;
  private itemMeta: ItemDefinition;

  constructor(public base: Base, public peer: Peer, public tank: TankPacket, public world: World) {
    this.pos = (this.tank.data?.xPunch as number) + (this.tank.data?.yPunch as number) * this.world.data.width;
    this.block = this.world.data.blocks[this.pos];
    this.itemMeta = this.base.items.metadata.items[this.block.fg || this.block.bg];
  }

  public async execute() {
    const dropped = this.world.data.dropped?.items.find((i) => i.uid === this.tank.data?.info);
    if (dropped) this.world.collect(this.peer, dropped.uid);
  }
}
