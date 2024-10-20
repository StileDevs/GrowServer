import { TextPacket } from "growtopia.js";
import { Base } from "../core/Base";
import { Peer } from "../core/Peer";
import consola from "consola";

export class ConnectListener {
  constructor(public base: Base) {
    consola.log('🦀 Listening ENet "connect" event');
  }

  public run(netID: number): void {
    const peer = new Peer(this.base, netID);
    const peerAddr = peer.data.enet.getAddress();

    consola.log(`➕ Peer ${netID} [/${peerAddr.address}:${peerAddr.port}] connected`);
    this.base.cache.peers.set(netID, peer.data);

    peer.send(TextPacket.from(0x1));
  }
}
