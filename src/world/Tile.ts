import { ItemDefinition, TankPacket, Variant } from "growtopia.js";
import type { Peer } from "../core/Peer";
import type { World } from "../core/World";
import { type TileData } from "../types";
import type { Base } from "../core/Base";
import { ExtendBuffer } from "../utils/ExtendBuffer";
import { TileMap } from "./tiles";
import { ActionTypes, BlockFlags, LockPermission, TankTypes, TileFlags } from "../Constants";
import { NormalTile } from "./tiles/NormalTile";

export class Tile {
  constructor(
    public base: Base,
    public world: World,
    public data: TileData
  ) { }

  // This is only applies to placed foreground blocks, as beckground block doesnt have any behaviour.
  public async onPlaceForeground(peer: Peer, itemMeta: ItemDefinition): Promise<void> {
    if (!peer.searchItem(itemMeta.id!)) return;
    if (!this.world.hasTilePermission(peer.data.userID, this.data, LockPermission.BUILD)) {
      await this.onPlaceFail(peer);
      return;
    }

    this.data.fg = itemMeta.id!;
    this.data.damage = 0;
    this.data.resetStateAt = 0;
    this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER) // preserve LOCKED and WATER

    if (itemMeta.flags! & BlockFlags.MULTI_FACING) {
      if (peer.data.rotatedLeft) this.data.flags |= TileFlags.FLIPPED;
    }

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      xPunch: this.data.x,
      yPunch: this.data.y,
      info:   this.data.fg,
      state:  (this.data.flags & TileFlags.FLIPPED ? 0x10 : 0) // set the rotateLeft flag
    });

    this.world.every((p) => {
      p.send(tank);
    })

    peer.removeItemInven(itemMeta.id!, 1);
  }

  public async onPlaceBackground(peer: Peer, itemMeta: ItemDefinition): Promise<void> {
    if (!this.world.hasTilePermission(peer.data.userID, this.data, LockPermission.BUILD) || !peer.searchItem(itemMeta.id!)) {
      this.onPlaceFail(peer);
      return;
    }

    this.data.bg = itemMeta.id!;
    if (!this.data.fg) this.data.damage = 0;

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      xPunch: this.data.x,
      yPunch: this.data.y,
      info:   this.data.bg
    });

    this.world.every((p) => {
      p.send(tank);
    })

    peer.removeItemInven(itemMeta.id!, 1);
  }

  // Fail only means that the player doing it doesnt have sufficient permission. 
  //  (applies to all function with Fail suffix that handle tile interactions)
  public async onPlaceFail(peer: Peer): Promise<void> {
    this.sendAreaOwner(peer);
    this.sendLockSound(peer);
  }

  public async onPunch(peer: Peer): Promise<void> {
    if (!this.world.hasTilePermission(peer.data.userID, this.data, LockPermission.BREAK)) {
      this.onPunchFail(peer);
      return;
    }
    if (this.data.fg == 0 && this.data.bg == 0) return;

    this.applyDamage(peer, 6);

    const itemHealth = this.base.items.metadata.items[this.data.fg ?? this.data.bg].breakHits!;

    if (this.data.damage && this.data.damage >= itemHealth) {
      this.onDestroy(peer);
    }
  }

  public async onPunchFail(peer: Peer): Promise<void> {
    this.sendLockSound(peer);
  }

  // this is called on background and foreground block destroy
  public async onDestroy(peer: Peer): Promise<void> {
    let destroyedItemID = 0;
    if (this.data.fg == 0) {
      destroyedItemID = this.data.bg;
      this.data.bg = 0;
    }
    else {
      destroyedItemID = this.data.fg;
      this.data.fg = 0;
    }

    this.data.damage = 0;
    this.data.resetStateAt = 0;
    this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER) // preserve LOCKED and WATER

    this.onDrop(peer, destroyedItemID);

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      info:   18,
      xPunch: this.data.x,
      yPunch: this.data.y
    });

    this.world.every((p) => {
      p.send(tank);
    })

  }

  public async onDrop(peer: Peer, destroyedItemID: number) {

  }

  public async onItemPlace(peer: Peer, item: ItemDefinition): Promise<void> {
    // TODO: Default behaviour when a player tries to place anything on an existing tile
    //  example: Display block, Splicing.
  }

  public async onWrench(peer: Peer): Promise<void> {
    // TODO: Default behaviour when a user tries to wrench the tile
  }

  // TOOD: Implement.
  public async onPlayerPass(peer: Peer): Promise<void> {

  }

  // TODO: Implement.
  public async onStep(peer: Peer): Promise<void> {

  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> { }

  // usually not needed to be overriden unless you want to do something funky
  public async setFlags(flags: number): Promise<number> { return flags; }

  public async setParentTileIndex(tileIndex: number): Promise<number> {
    return this.data.lock
      ? (this.data.lock.ownerX as number) +
      (this.data.lock.ownerY as number) * this.world.data.width
      : 0;
  }

  private async serializeBlockData(dataBuffer: ExtendBuffer) {
    dataBuffer.writeU16(this.data.fg);
    dataBuffer.writeU16(this.data.bg);
    dataBuffer.writeU16(await this.setParentTileIndex(0));

    const flags = await this.setFlags(this.data.flags);

    dataBuffer.writeU16(flags);

    if (flags & TileFlags.LOCKED) {
      dataBuffer.grow(2);

      const lockPos = this.data.lock
        ? (this.data.lock.ownerX as number) +
        (this.data.lock.ownerY as number) * this.world.data.width
        : 0;

      dataBuffer.writeU16(lockPos);
    }
  }

  public async applyDamage(peer: Peer, damage: number): Promise<void> {
    if (peer.data.world == this.world.worldName) {
      if (!this.data.resetStateAt || this.data.resetStateAt as number <= Date.now()) this.data.damage = 0;
      // i dont like how there are no health field in the item meta. But atleast there is a workaround :) - Badewen
      if (damage != 0) {
        (this.data.damage as number) += damage / 6;
      }

      const tank = new TankPacket(
        {
          type:   TankTypes.TILE_APPLY_DAMAGE,
          netID:  peer.data.netID,
          info:   damage,
          xPunch: this.data.x,
          yPunch: this.data.y
        }
      )

      const itemMeta = this.base.items.metadata.items[this.data.fg ? this.data.fg : this.data.bg];

      this.data.resetStateAt =
        Date.now() + (itemMeta.resetStateAfter as number) * 1000;

      this.world.every((p) => {
        p.send(tank);
      })

    }
  }

  public async parse(): Promise<ExtendBuffer> {
    // default blocks contains length of 8
    const dataBuffer = new ExtendBuffer(8);

    await this.serializeBlockData(dataBuffer);
    await this.serialize(dataBuffer);

    return dataBuffer;
  }

  public async tileUpdate(peer: Peer) {
    const serializedData = await this.parse();

    this.world.every((p) => {
      p.send(
        TankPacket.from({
          type:   TankTypes.SEND_TILE_UPDATE_DATA,
          xPunch: this.data.x,
          yPunch: this.data.y,
          data:   () => serializedData.data
        })
      );
    })
  }

  protected sendLockSound(peer: Peer) {
    if (this.world) {
      this.world.every((p) => {
        p.sendOnPlayPositioned("audio/punch_locked.wav", { netID: peer.data?.netID });
      });
    }
  }

  private sendAreaOwner(peer: Peer) {
    const owningLock = this.world.data.blocks[this.data.lock!.ownerY! * this.world.data.width + this.data.lock!.ownerX!];

    const ownerName = this.world.data.owner?.name ?? owningLock.lock?.ownerName;

    peer.sendTextBubble(`That area is owned by ${ownerName}`, true, peer.data.netID);
  }

}
