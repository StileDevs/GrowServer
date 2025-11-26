import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ActionTypes, LOCKS, ROLE } from "@growserver/const";
import { World } from "../../core/World";

export class ConfirmClearWorld {
  private world: World;

  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
    }>,
  ) {
    this.world = this.peer.currentWorld()!;
  }

  public async execute(): Promise<void> {
    if (!this.action.dialog_name) return;
    const ownerUID = this.world.getOwnerUID();
    if (ownerUID) {
      if (
        ownerUID !== this.peer.data.userID &&
        this.peer.data.role != ROLE.DEVELOPER
      )
        return;
      for (let i = 0; i < this.world.data.blocks.length; i++) {
        const b = this.world.data.blocks[i];
        const itemMeta = this.base.items.metadata.items.get(
          (b.fg || b.bg).toString(),
        )!;
        const mLock = LOCKS.find((l) => l.id === itemMeta.id);

        if (
          b.fg === 6 ||
          b.fg === 8 ||
          (!mLock && itemMeta.type === ActionTypes.LOCK)
        )
          continue;

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

      const world = this.peer.currentWorld();
      if (world) {
        world.every((p) => {
          p.leaveWorld();
        });
      }
    }
  }
}
