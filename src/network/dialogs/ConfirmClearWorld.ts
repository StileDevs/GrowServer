import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ActionTypes, LOCKS } from "../../Constants";
import { World } from "../../core/World";

export class ConfirmClearWorld {
  private world: World;

  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
    }>
  ) {
    this.world = this.peer.currentWorld()!;
  }

  public async execute(): Promise<void> {
    if (this.world.data.owner) {
      if (this.world.data.owner.id !== this.peer.data.id_user) return;
      for (let i = 0; i < this.world.data.blocks.length; i++) {
        const b = this.world.data.blocks[i];
        const itemMeta = this.base.items.metadata.items[b.fg || b.bg];
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

      this.peer.every((p) => {
        if (p.data.world === this.peer.data.world && p.data.world !== "EXIT") {
          p.leaveWorld();
          // p.enterWorld(lastWorld);
        }
      });
    }
  }
}
