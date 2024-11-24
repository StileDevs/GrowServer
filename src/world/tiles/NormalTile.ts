import type { World } from "../../core/World";
import type { Block } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";

export class NormalTile extends Tile {
  public data: ExtendBuffer;

  constructor(public world: World, public block: Block, public alloc = 8) {
    super(world, block, alloc);
    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {
    // nothing todo here :>
    return;
  }

  public async setFlags(): Promise<void> {
    // nothing todo here too :>
    return;
  }
}
