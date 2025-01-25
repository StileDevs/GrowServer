import { TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { Block } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";

export class DisplayBlockTile extends Tile {
  public data: ExtendBuffer;
  public extraType = TileExtraTypes.DISPLAY_BLOCK;

  constructor(
    public base: Base,
    public world: World,
    public block: Block,
    public alloc = 13
  ) {
    super(base, world, block, alloc);
    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {
    this.data.writeU8(this.extraType);
    this.data.writeU32(this.block.dblockID || 0);
    return;
  }

  public async setFlags(): Promise<void> {
    this.flags |= TileFlags.TILEEXTRA;
    return;
  }
}
