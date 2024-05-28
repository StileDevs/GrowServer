import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { DialogReturnType } from "../types";
import { ActionTypes } from "../utils/enums/Tiles";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "confirm_clearworld"
    };
  }

  public handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
    }>
  ): void {
    const world = peer.hasWorld(peer.data.world);
    const lastWorld = `${peer.data.world}`;

    if (world?.data.owner) {
      if (world.data.owner.id !== peer.data.id_user) return;
      for (let i = 0; i < world.data.blocks.length; i++) {
        const b = world?.data.blocks[i];
        const itemMeta = this.base.items.metadata.items[b.fg || b.bg];
        const mLock = this.base.locks.find((l) => l.id === itemMeta.id);

        if (b.fg === 6 || b.fg === 8 || (!mLock && itemMeta.type === ActionTypes.LOCK)) continue;

        Object.keys(b).forEach((v) => {
          if (v === "x" || v === "y") {
            // nothing
          } else if (v === "fg" || v === "bg") {
            b[v] = 0;
          } else {
            // @ts-expect-error idk this typing
            b[v] = undefined;
          }
        });
      }

      peer.everyPeer((p) => {
        if (p.data.world === lastWorld && p.data.world !== "EXIT") {
          p.leaveWorld();
          // p.enterWorld(lastWorld);
        }
      });
    }
  }
}
