import { Peer } from "../structures/Peer.js";
import { BaseServer } from "../structures/BaseServer.js";
import type { DialogConfig, DialogReturnType } from "../types";

export abstract class Dialog {
  public config: DialogConfig;
  public base: BaseServer;

  constructor(base: BaseServer) {
    this.base = base;
    this.config = {
      dialogName: undefined
    };
  }

  public handle(peer: Peer, action: DialogReturnType<unknown>) {}
}
