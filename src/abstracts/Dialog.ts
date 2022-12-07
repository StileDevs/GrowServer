import { Peer } from "../structures/Peer";
import { BaseServer } from "../structures/BaseServer";
import { DialogConfig, DialogReturnType } from "../types/dialog";

export abstract class Dialog {
  public config: DialogConfig;

  constructor() {
    this.config = {
      dialogName: undefined
    };
  }

  public handle(base: BaseServer, peer: Peer, action: DialogReturnType<unknown>) {}
}
