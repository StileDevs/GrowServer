import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { LOCKS } from "../../Constants";
import { Block, Lock } from "../../types";
import { Floodfill } from "../../utils/FloodFill";
import { World } from "../../core/World";
import { Tile } from "../../world/Tile";
import { ItemDefinition } from "growtopia.js";

export class AreaLockEdit {
  private world: World;
  private pos: number;
  private block: Block;
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
    this.block = this.world?.data.blocks[this.pos] as Block;
    this.itemMeta = this.base.items.metadata.items.find(
      (i) => i.id === parseInt(this.action.lockID)
    )!;
  }

  public async execute(): Promise<void> {
    const mLock = LOCKS.find((l) => l.id === parseInt(this.action.lockID));

    if (this.block.lock?.ownerUserID !== this.peer.data?.id_user) return;

    const openToPublic = this.action.allow_break_build === "1" ? true : false;
    const ignoreEmpty = this.action.ignore_empty === "1" ? true : false;
    const allowBuildOnly = this.action.build_only === "1" ? true : false;
    const adminLimitedAccess = this.action.limit_admin === "1" ? true : false;

    this.block.lock.openToPublic = openToPublic;
    this.block.lock.ignoreEmptyAir = ignoreEmpty;
    this.block.lock.onlyAllowBuild = allowBuildOnly;
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
        blocks:     this.world.data.blocks as Block[],
        s_block:    this.block,
        base:       this.base,
        noEmptyAir: ignoreEmpty
      });
      algo.exec();
      algo.apply(this.world, this.peer);
    }

    Tile.tileUpdate(
      this.base,
      this.peer,
      this.world,
      this.block,
      this.itemMeta.type as number
    );
  }
}
