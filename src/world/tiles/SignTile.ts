import { TileExtraTypes, TileFlags } from "../../Constants.js";
import type { World } from "../../core/World.js";
import type { Block } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer.js";
import { Tile } from "../Tile.js";

export class SignTile extends Tile {
  public data: ExtendBuffer;
  public extraType = TileExtraTypes.SIGN;
  private label: string;

  constructor(public world: World, public block: Block, public alloc = 15) {
    super(world, block, alloc);

    this.label = this.block.sign?.label || "";
    this.alloc += this.label.length;

    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {
    this.data.writeU8(this.extraType);
    this.data.writeString(this.label);
    this.data.writeI32(-1);

    return;
  }

  public async setFlags(): Promise<void> {
    this.flags |= TileFlags.TILEEXTRA;

    if (this.block.rotatedLeft) this.flags |= TileFlags.ROTATED_LEFT;

    return;
  }
}
