import { Action } from "../abstracts/Action";
import { Peer } from "../structures/Peer";
import { BaseServer } from "../structures/BaseServer";
import { ActionType } from "../types/action";

export default class extends Action {
  constructor() {
    super();
    this.config = {
      eventName: "dialog_return"
    };
  }

  public handle(base: BaseServer, peer: Peer, action: ActionType<{ action: string; dialog_name: string }>): void {
    const name = action.dialog_name;
    try {
      if (!base.dialogs.has(name)) return;
      base.dialogs.get(name)?.handle(base, peer, action);
    } catch (err) {
      base.log.error(err);
    }
  }
}
