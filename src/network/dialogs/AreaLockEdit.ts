import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { LockPermission, LOCKS, TileFlags } from "../../Constants";
import { TileData, Lock } from "../../types";
import { Floodfill } from "../../utils/FloodFill";
import { World } from "../../core/World";
import { Tile } from "../../world/Tile";
import { ItemDefinition } from "growtopia.js";
import { tileFrom } from "../../world/tiles";

export class AreaLockEdit {
  private world: World;
  private pos: number;
  private block: TileData;
  private itemMeta: ItemDefinition;

  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      tilex: string;
      tiley: string;
      playerNetID: string;
      allow_break_build: string;
      ignore_empty: string;
      build_only: string;
      limit_admin: string;
      lockID: string;
      buttonClicked: string;
    }>
  ) {
    this.world = this.peer.currentWorld()!;
    this.pos =
      parseInt(this.action.tilex) +
      parseInt(this.action.tiley) * (this.world?.data.width as number);
    this.block = this.world?.data.blocks[this.pos] as TileData;
    this.itemMeta = this.base.items.metadata.items.find(
      (i) => i.id === parseInt(this.action.lockID)
    )!;
  }

  public async execute(): Promise<void> {
    const mLock = LOCKS.find((l) => l.id === parseInt(this.action.lockID));

    if (this.block.lock?.ownerUserID !== this.peer.data?.userID) return;

    const openToPublic = this.action.allow_break_build === "1" ? true : false;
    const ignoreEmpty = this.action.ignore_empty === "1" ? true : false;
    const allowBuildOnly = this.action.build_only === "1" ? true : false;
    const adminLimitedAccess = this.action.limit_admin === "1" ? true : false;

    if (openToPublic) this.block.flags |= TileFlags.PUBLIC;
    else this.block.flags &= ~TileFlags.PUBLIC;

    this.block.lock.ignoreEmptyAir = ignoreEmpty;
    this.block.lock.permission = allowBuildOnly ? LockPermission.BUILD : mLock?.defaultPermission;
    this.block.lock.adminLimited = adminLimitedAccess;

    if (this.action.buttonClicked === "reapply_lock") {
      this.world.data.blocks?.forEach((b) => {
        if (
          b.lock &&
          b.lock.ownerX === this.block.x &&
          b.lock.ownerY === this.block.y
        )
          b.lock = undefined;
      });

      const algo = new Floodfill({
        s_node: {
          x: parseInt(this.action.tilex),
          y: parseInt(this.action.tiley)
        },
        max:        (mLock as Lock).maxTiles || 0,
        width:      this.world.data.width || 100,
        height:     this.world.data.height || 60,
        blocks:     this.world.data.blocks as TileData[],
        s_block:    this.block,
        base:       this.base,
        noEmptyAir: ignoreEmpty
      });
      algo.exec();
      algo.apply(this.world, this.peer);

      this.world.every((p) => p.sendOnPlayPositioned("audio/use_lock.wav", { netID: this.peer.data.netID }));
    }
    else if (this.action.playerNetID) {
      const targetPeer = this.world.getPeerByNetID(parseInt(this.action.playerNetID));
      if (!targetPeer) return;

      if (targetPeer.data.userID == this.block.lock.ownerUserID) {
        this.peer.sendTextBubble("I already have access!", false);
        return;
      }

      if (this.block.lock.adminIDs?.includes(targetPeer.data.userID)) {
        this.peer.sendTextBubble(`${targetPeer.name} already has access to the lock.`, false);
        return;
      }

      this.block.lock.adminIDs?.push(targetPeer.data.userID);
      this.peer.sendTextBubble(`Added ${targetPeer.name} access to lock`, false);
      this.world.every((p) => p.sendConsoleMessage(`${this.peer.name} added ${targetPeer.name} to a ${this.itemMeta.name}.`));
      targetPeer.sendSFX("audio/secret.wav", 0);
    }

    for (const unaccessedPlayer of this.getUnaccessedPlayers()) {
      const playerData = await this.base.database.players.getByUID(unaccessedPlayer);
      if (!playerData) continue;

      const index = this.block.lock.adminIDs!.indexOf(unaccessedPlayer);
      if (index == -1) continue;

      this.block.lock.adminIDs?.splice(index, 1);

      this.world.every((p) => {
        p.sendConsoleMessage(`${playerData.name} was removed from a ${this.itemMeta.name}`);
      })
    }

    const tile = tileFrom(this.base, this.world, this.block);
    this.world.every((p) => tile.tileUpdate(p));
  }

  // get the player that the owner just un-accessed
  // WARNING: This is kinda hackery
  private getUnaccessedPlayers(): number[] {
    const players = [];

    for (const key in this.action) {
      const prefixIndex = key.search(/^access_.*/);
      // need to disable this to access it like a "JSON" object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (prefixIndex != -1 && (this.action as any)[key] == "0") {
        const userID = parseInt(key.substring(prefixIndex + "access_".length));
        if (this.block.lock?.adminIDs && this.block.lock.adminIDs.includes(userID)) {
          players.push(userID);
        }
      }
    }

    return players;
  }
}
