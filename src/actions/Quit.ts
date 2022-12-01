import { Peer, TankPacket, Variant } from "growsockets";
import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";

export default class extends Action {
  constructor() {
    super();
    this.config = {
      eventName: "quit"
    };
  }

  public handle(base: BaseServer, peer: Peer<{ netID: number }>): void {
    peer.disconnect();
  }
}
