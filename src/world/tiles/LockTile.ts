import { TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { Block } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";

export class LockTile extends Tile {
  public data: ExtendBuffer;
  public extraType = TileExtraTypes.LOCK;
  public adminCount: number;
  public ownerID: number;

  constructor(
    public base: Base,
    public world: World,
    public block: Block,
    public alloc = 26
  ) {
    super(base, world, block, alloc);
    this.ownerID = (
      this.block.lock ? this.block.lock.ownerUserID : this.world.data.owner?.id
    ) as number;
    this.adminCount = 0;

    this.alloc += 4 * this.adminCount;
    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {
    this.data.writeU16(this.extraType | (0 << 8));
    this.data.writeU32(this.ownerID);
    this.data.writeU32(this.adminCount);
    this.data.writeI32(-100);

    return;
  }

  public async setFlags(): Promise<void> {
    this.flags |= TileFlags.TILEEXTRA;
    return;
  }
}
