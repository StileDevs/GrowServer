import { Base } from "../core/Base";
import consola from "consola";

export class DisconnectListener {
  constructor(public base: Base) {
    consola.log('🧷Listening ENet "disconnect" event');
  }

  public run(netID: number): void {
    consola.log(`➖Peer ${netID} disconnected`);
    this.base.cache.peers.delete(netID);
  }
}
