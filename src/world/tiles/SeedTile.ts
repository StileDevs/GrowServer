import { TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { Block } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";

export class SeedTile extends Tile {
  public data: ExtendBuffer;
  public extraType = TileExtraTypes.SEED;

  constructor(
    public base: Base,
    public world: World,
    public block: Block,
    public alloc = 14
  ) {
    super(base, world, block, alloc);
    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {
    this.data.writeU8(this.extraType);
    this.data.writeU32(
      Math.floor((Date.now() - (this.block.tree?.plantedAt as number)) / 1000)
    );
    this.data.writeU8(
      (this.block.tree?.fruitCount as number) > 4
        ? 4
        : (this.block.tree?.fruitCount as number)
    );

    return;
  }

  public async setFlags(): Promise<void> {
    if (this.block.toggleable?.open) this.flags |= TileFlags.OPEN;
    if (this.block.toggleable?.public) this.flags |= TileFlags.PUBLIC;
    return;
  }
}
