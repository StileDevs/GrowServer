import { TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { Block } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";

export class SwitcherOO extends Tile {
  public data: ExtendBuffer;

  constructor(public base: Base, public world: World, public block: Block, public alloc = 8) {
    super(base, world, block, alloc);
    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {
    return;
  }

  public async setFlags(): Promise<void> {
    if (this.block.toggleable?.open) this.flags |= TileFlags.OPEN;
    if (this.block.toggleable?.public) this.flags |= TileFlags.PUBLIC;
    return;
  }
}
