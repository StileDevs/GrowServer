import { Peer } from "../structures/Peer.js";
import type { ActionConfig, ActionType } from "../types";
import { BaseServer } from "../structures/BaseServer.js";

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
