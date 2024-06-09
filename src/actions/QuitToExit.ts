import { Action } from "../abstracts/Action.js";
import { Peer } from "../structures/Peer.js";
import { BaseServer } from "../structures/BaseServer.js";
import type { ActionType } from "../types";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "quit_to_exit"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string }>): void {
    peer.leaveWorld();
  }
}
