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

export class RevokeLockAccess {
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
      lockID: string;
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
    if (this.block.lock?.ownerUserID !== this.peer.data?.userID) {
      if (this.block.lock?.adminIDs?.includes(this.peer.data.userID)) {
        const index = this.block.lock.adminIDs.indexOf(this.peer.data.userID);
        if (index == -1) return;

        this.block.lock.adminIDs.splice(index, 1);

        this.world.every((p) => p.sendConsoleMessage(`${this.peer.name} removed their access from a ${this.itemMeta.name}`))

        const tile = tileFrom(this.base, this.world, this.block);
        this.world.every((p) => tile.tileUpdate(p));
      }
      return;
    }
  }
}
