import { TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { Block } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";
import { Peer } from "../../core/Peer";

export class HeartMonitorTile extends Tile {
  public data: ExtendBuffer;
  public extraType = TileExtraTypes.HEART_MONITOR;
  private name: string;
  private userId: number;

  constructor(
    public base: Base,
    public world: World,
    public block: Block,
    public alloc = 15
  ) {
    super(base, world, block, alloc);

    this.name = this.block.heartMonitor?.name || "";
    this.alloc += this.name.length;

    this.userId = this.block.heartMonitor?.userID || 0;

    this.data = new ExtendBuffer(this.alloc);
  }

  public async serialize(): Promise<void> {
    this.data.writeU8(this.extraType);
    this.data.writeU32(this.userId);
    this.data.writeString(this.name);
    return;
  }

  public async setFlags(): Promise<void> {
    this.flags |= TileFlags.TILEEXTRA;

    if (this.block.rotatedLeft) this.flags |= TileFlags.ROTATED_LEFT;

    const targetPeerId = this.base.cache.peers.find(
      (v) => v.id_user === this.userId
    );
    if (targetPeerId) {
      const targetPeer = new Peer(this.base, targetPeerId.netID);

      if (targetPeer) this.flags |= TileFlags.OPEN;
    }

    return;
  }
}
