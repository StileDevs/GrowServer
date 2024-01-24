import { Action } from "../abstracts/Action";
import { Peer } from "../structures/Peer";
import { BaseServer } from "../structures/BaseServer";
import { ActionType } from "../types/action";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "quit"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string }>): void {
    peer.disconnect();
  }
}
