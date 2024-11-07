import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base.js";
import { Peer } from "../../core/Peer.js";
import { DialogMap } from "../dialogs/index.js";
import consola from "consola";

export class DialogReturn {
  constructor(public base: Base, public peer: Peer) {}

  public async execute(action: NonEmptyObject<{ dialog_name: string }>): Promise<void> {
    try {
      let Class = DialogMap[action.dialog_name];

      if (!Class) throw new Error(`No Dialog class found with dialog name ${action.dialog_name}`);

      const dialog = new Class(this.base, this.peer, action);
      await dialog.execute();
    } catch (e) {
      consola.warn(e);
    }
  }
}
