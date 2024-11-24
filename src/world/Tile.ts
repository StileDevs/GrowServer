import type { World } from "../core/World";
import type { Block } from "../types";
import { ExtendBuffer } from "../utils/ExtendBuffer";

export abstract class Tile {
  public abstract data: ExtendBuffer;
  public lockPos: number;
  public flags: number;

  constructor(public world: World, public block: Block, public alloc = 8) {
    this.lockPos = this.block.lock && !this.block.lock.isOwner ? (this.block.lock.ownerX as number) + (this.block.lock.ownerY as number) * this.world.data.width : 0;
    this.flags = 0x0;
  }

  public abstract serialize(): Promise<void>;
  public abstract setFlags(): Promise<void>;

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
}
