import { Peer } from "../structures/Peer";
import { ActionConfig, ActionType } from "../types/action";
import { BaseServer } from "../structures/BaseServer";

export abstract class Action {
  public config: ActionConfig;
  public base: BaseServer;

  constructor(base: BaseServer) {
    this.base = base;
    this.config = {
      eventName: undefined
    };
  }

  public handle(peer: Peer, action: ActionType<unknown>) {}
}
