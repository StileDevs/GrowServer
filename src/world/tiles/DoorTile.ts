import { TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { Block } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";

export class DoorTile extends Tile {
  public data: ExtendBuffer;
  public extraType = TileExtraTypes.DOOR;
  private label: string;

  constructor(
    public base: Base,
    public world: World,
    public block: Block,
    public alloc = 12
  ) {
    super(base, world, block, alloc);

    this.label = this.block.door?.label || "";
    this.alloc += this.label.length;

    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {
    this.data.writeU8(this.extraType);
    this.data.writeString(this.label);
    // first param send red text bubble locked/not (0x8/0x0)
    this.data.writeU8(0x0);

    return;
  }

  public async setFlags(): Promise<void> {
    this.flags |= TileFlags.TILEEXTRA;
    return;
  }
}
