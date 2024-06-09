import { Dialog } from "../abstracts/Dialog.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import { Place } from "../tanks/Place.js";
import type { DialogReturnType, Block, Lock } from "../types";
import { Floodfill } from "../structures/FloodFill.js";
import { World } from "../structures/World.js";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "area_lock_edit"
    };
  }

  public handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
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
  ): void {
    const world = peer.hasWorld(peer.data.world);
    const pos = parseInt(action.tilex) + parseInt(action.tiley) * (world?.data.width as number);
    const block = world?.data.blocks[pos] as Block;
    const mLock = this.base.locks.find((l) => l.id === parseInt(action.lockID));
    const itemMeta = this.base.items.metadata.items.find((i) => i.id === parseInt(action.lockID));

    if (block.lock?.ownerUserID !== peer.data?.id_user) return;
    const openToPublic = action.allow_break_build === "1" ? true : false;
    const ignoreEmpty = action.ignore_empty === "1" ? true : false;
    const allowBuildOnly = action.build_only === "1" ? true : false;
    const adminLimitedAccess = action.limit_admin === "1" ? true : false;

    block.lock.openToPublic = openToPublic;
    block.lock.ignoreEmptyAir = ignoreEmpty;
    block.lock.onlyAllowBuild = allowBuildOnly;
    block.lock.adminLimited = adminLimitedAccess;

    if (action.buttonClicked === "reapply_lock") {
      world?.data.blocks?.forEach((b) => {
        if (b.lock && b.lock.ownerX === block.x && b.lock.ownerY === block.y) b.lock = undefined;
      });

      const algo = new Floodfill({
        s_node: { x: parseInt(action.tilex), y: parseInt(action.tiley) },
        max: (mLock as Lock).maxTiles || 0,
        width: world?.data.width || 100,
        height: world?.data.height || 60,
        blocks: world?.data.blocks as Block[],
        s_block: block,
        base: this.base,
        noEmptyAir: ignoreEmpty
      });
      algo.exec();
      algo.apply(world as World, peer);
    }

    Place.tileUpdate(this.base, peer, itemMeta?.type || 0, block, world as World);
  }
}
