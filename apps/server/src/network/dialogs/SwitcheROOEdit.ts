import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { TileData } from "@growserver/types";
import { World } from "../../core/World";
import { Tile } from "../../world/Tile";
import { tileFrom } from "../../world/tiles";
import { LockPermission, TileFlags } from "@growserver/const";

export class SwitcheROOEdit {
  private world: World;
  private pos: number;
  private block: TileData;

  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      tilex: string;
      tiley: string;
      checkbox_public?: string;
    }>,
  ) {
    this.world = this.peer.currentWorld()!;
    this.pos =
      parseInt(this.action.tilex) +
      parseInt(this.action.tiley) * (this.world?.data.width as number);
    this.block = this.world?.data.blocks[this.pos] as TileData;
  }

  public async execute(): Promise<void> {
    if (
      !this.action.dialog_name ||
      !this.action.tilex ||
      !this.action.tiley ||
      !this.action.checkbox_public
    )
      return;
    if (
      !(await this.world.hasTilePermission(
        this.peer.data.userID,
        this.block,
        LockPermission.BUILD,
      ))
    ) {
      return;
    }

    if (this.action.checkbox_public == "1") {
      this.block.flags |= TileFlags.PUBLIC;
    } else {
      this.block.flags &= ~TileFlags.PUBLIC; // unset PUBLIC flag
    }

    const switcheRooTile = tileFrom(this.base, this.world, this.block);
    this.world.every((p) => switcheRooTile.tileUpdate(p));
  }
}
