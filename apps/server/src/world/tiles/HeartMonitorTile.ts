import { TileExtraTypes, TileFlags } from "@growserver/const";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import { type TileData } from "@growserver/types";
import { ExtendBuffer } from "@growserver/utils";
import { Tile } from "../Tile";
import { Peer } from "../../core/Peer";
import { ItemDefinition } from "grow-items";

export class HeartMonitorTile extends Tile {
  public extraType = TileExtraTypes.HEART_MONITOR;

  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
  }

  public async onPlaceForeground(
    peer: Peer,
    itemMeta: ItemDefinition,
  ): Promise<boolean> {
    if (!(await super.onPlaceForeground(peer, itemMeta))) {
      return false;
    }

    this.data.heartMonitor = { userID: peer.data.userID };
    this.data.flags |= TileFlags.TILEEXTRA;

    let heartMonitorArray = peer.data.heartMonitors.get(this.world.worldName);

    if (!heartMonitorArray) {
      heartMonitorArray = new Array<number>();
    }

    heartMonitorArray.push(this.data.y * this.world.data.width + this.data.x);
    peer.data.heartMonitors.set(this.world.worldName, heartMonitorArray);

    // await peer.saveToCache();
    this.world.every((p) => this.tileUpdate(p));
    return true;
  }

  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);

    const idx = peer.data.heartMonitors
      .get(this.world.worldName)!
      .findIndex((v) => v == this.data.y * this.world.data.width + this.data.x);

    if (idx) peer.data.heartMonitors.get(this.world.worldName)!.splice(idx, 1);

    // await peer.saveToCache();

    this.data.heartMonitor = undefined;
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);

    const user = await this.base.database.players.getByUID(
      this.data.heartMonitor!.userID,
    );
    dataBuffer.grow(7 + (user?.display_name.length ?? 0));
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeU32(this.data.heartMonitor!.userID);
    dataBuffer.writeString(user?.display_name ?? "");
  }

  public async setFlags(flags: number): Promise<number> {
    flags = await super.setFlags(flags);

    const targetPeer = this.base.cache.peers.find(
      (p) => p.userID == this.data.heartMonitor!.userID,
    );

    if (targetPeer) {
      flags |= TileFlags.OPEN;
    }

    return flags;
  }

  // public async setFlags(): Promise<void> {
  //   this.flags |= TileFlags.TILEEXTRA;

  //   if (this.block.rotatedLeft) this.flags |= TileFlags.ROTATED_LEFT;

  //   const targetPeerId = this.base.cache.peers.find(
  //     (v) => v.userID === this.userId
  //   );
  //   if (targetPeerId) {
  //     const targetPeer = new Peer(this.base, targetPeerId.netID);

  //     if (targetPeer) this.flags |= TileFlags.OPEN;
  //   }

  //   return;
  // }
}
