import { TankPacket } from "growtopia.js";
import type { Peer } from "../core/Peer";
import type { World } from "../core/World";
import type { Block } from "../types";
import type { Base } from "../core/Base";
import { ExtendBuffer } from "../utils/ExtendBuffer";
import { tileParse } from "./tiles";
import { TankTypes } from "../Constants";

export class Tile {
  public data: ExtendBuffer;
  public lockPos: number;
  public flags: number;

  constructor(public base: Base, public world: World, public block: Block, public alloc = 8) {
    this.lockPos = this.block.lock && !this.block.lock.isOwner ? (this.block.lock.ownerX as number) + (this.block.lock.ownerY as number) * this.world.data.width : 0;
    this.flags = 0x0;
    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {}

  public async setFlags(): Promise<void> {}

  private async serializeBlockData(lockPos: number, flags: number) {
    this.data.writeU32(this.block.fg | (this.block.bg << 16));
    this.data.writeU16(lockPos);
    this.data.writeU16(flags);
  }

  public async init() {
    await this.setFlags();
    await this.serializeBlockData(this.lockPos, this.flags);
    await this.serialize();

    return;
  }

  public async parse() {
    return this.data.data;
  }

  public static async tileUpdate(base: Base, peer: Peer, world: World, block: Block, type: number) {
    const data = await tileParse(type, base, world, block);

    peer.every((p) => {
      if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
        p.send(
          TankPacket.from({
            type: TankTypes.SEND_TILE_UPDATE_DATA,
            xPunch: block.x,
            yPunch: block.y,
            data: () => data
          })
        );
      }
    });
  }
}
