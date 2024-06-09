import { Action } from "../abstracts/Action.js";
import { Peer } from "../structures/Peer.js";
import { BaseServer } from "../structures/BaseServer.js";
import type { ActionType } from "../types";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "dialog_return"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string; dialog_name: string }>): void {
    const name = action.dialog_name;
    try {
      if (!this.base.dialogs.has(name)) return;
      this.base.dialogs.get(name)?.handle(peer, action);
    } catch (err) {
      this.base.log.error(err);
    }
  }
}
