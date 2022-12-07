import { Peer } from "../structures/Peer";
import { ActionConfig, ActionType } from "../types/action";
import { BaseServer } from "../structures/BaseServer";

export abstract class Action {
  public config: ActionConfig;

  constructor() {
    this.config = {
      eventName: undefined
    };
  }

  public handle(base: BaseServer, peer: Peer, action: ActionType<unknown>) {}
}
