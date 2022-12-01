import { Peer } from "growsockets";
import { ActionConfig, ActionType } from "../types/action";
import { BaseServer } from "../structures/BaseServer";

export abstract class Action {
  public config: ActionConfig;

  constructor() {
    this.config = {
      eventName: undefined
    };
  }

  public handle(base: BaseServer, peer: Peer<unknown>, action: ActionType<unknown>) {}
}
