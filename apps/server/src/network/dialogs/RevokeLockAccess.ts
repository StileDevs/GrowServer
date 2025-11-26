import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import {
  ActionTypes,
  LockPermission,
  LOCKS,
  TileFlags,
} from "@growserver/const";
import { TileData } from "@growserver/types";
import { Floodfill } from "../../world/FloodFill";
import { World } from "../../core/World";
import { Tile } from "../../world/Tile";
import { ItemDefinition } from "grow-items";
import { tileFrom } from "../../world/tiles";

export class RevokeLockAccess {
  private world: World;
  private pos: number;
  private block: TileData;
  private itemMeta?: ItemDefinition;

  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      tilex: string;
      tiley: string;
    }>,
  ) {
    this.world = this.peer.currentWorld()!;
    this.pos =
      parseInt(this.action.tilex) +
      parseInt(this.action.tiley) * (this.world?.data.width as number);
    this.block = this.world?.data.blocks[this.pos] as TileData;
    this.itemMeta = this.base.items.metadata.items.get(
      this.block.fg.toString(),
    )!;
  }

  public async execute(): Promise<void> {
    if (
      !this.action.dialog_name ||
      this.itemMeta?.type != ActionTypes.LOCK ||
      !this.action.tilex ||
      !this.action.tiley
    )
      return;
    if (this.block.lock?.ownerUserID !== this.peer.data?.userID) {
      if (this.block.lock?.adminIDs?.includes(this.peer.data.userID)) {
        const index = this.block.lock.adminIDs.indexOf(this.peer.data.userID);
        if (index == -1) return;

        this.block.lock.adminIDs.splice(index, 1);

        this.world.every((p) =>
          p.sendConsoleMessage(
            `${this.peer.data.displayName} removed their access from a ${this.itemMeta?.name}`,
          ),
        );

        const tile = tileFrom(this.base, this.world, this.block);
        this.world.every((p) => tile.tileUpdate(p));
      }
      return;
    }
  }
}
