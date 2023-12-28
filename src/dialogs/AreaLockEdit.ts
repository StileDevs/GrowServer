import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { tileUpdate } from "../tanks/BlockPlacing";
import { DialogReturnType } from "../types/dialog";
import { Floodfill } from "../structures/FloodFill";

export default class extends Dialog {
  constructor() {
    super();
    this.config = {
      dialogName: "area_lock_edit"
    };
  }

  public handle(
    base: BaseServer,
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
    const world = peer.hasWorld(peer.data?.world!);
    const pos = parseInt(action.tilex) + parseInt(action.tiley) * world?.data.width!;
    const block = world?.data.blocks![pos]!;
    const mLock = base.locks.find((l) => l.id === parseInt(action.lockID));
    const itemMeta = base.items.metadata.items.find((i) => i.id === parseInt(action.lockID));

    if (block.lock?.ownerUserID !== peer.data?.id_user) return;
    const openToPublic = action.allow_break_build === "1" ? true : false;
    const ignoreEmpty = action.ignore_empty === "1" ? true : false;
    const allowBuildOnly = action.build_only === "1" ? true : false;
    const adminLimitedAccess = action.limit_admin === "1" ? true : false;

    block.lock!.openToPublic = openToPublic;
    block.lock!.ignoreEmptyAir = ignoreEmpty;
    block.lock!.onlyAllowBuild = allowBuildOnly;
    block.lock!.adminLimited = adminLimitedAccess;

    if (action.buttonClicked === "reapply_lock") {
      world?.data.blocks?.forEach((b) => {
        if (b.lock && b.lock.ownerX === block.x && b.lock.ownerY === block.y) b.lock = undefined;
      });

      const algo = new Floodfill({
        s_node: { x: parseInt(action.tilex), y: parseInt(action.tiley) },
        max: mLock!.maxTiles,
        width: world?.data.width!,
        height: world?.data.height!,
        blocks: world?.data.blocks!,
        s_block: block,
        base: base,
        noEmptyAir: ignoreEmpty
      });
      algo.exec();
      algo.apply(world!, peer);
    }

    tileUpdate(base, peer, itemMeta?.type!, block, world!);
  }
}
