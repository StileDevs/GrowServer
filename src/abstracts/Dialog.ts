import { Peer } from "../structures/Peer";
import { BaseServer } from "../structures/BaseServer";
import { DialogConfig, DialogReturnType } from "../types/dialog";

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
