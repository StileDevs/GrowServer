import { TextPacket } from "growtopia.js";
import { Listener } from "../abstracts/Listener.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";

export default class extends Listener<"connect"> {
  constructor(base: BaseServer) {
    super(base);
    this.name = "connect";
  }

  public run(netID: number): void {
    const peer = new Peer(this.base, netID);

    const peerAddr = peer.data.enet.getAddress();

    this.base.log.info("Peer", netID, `[/${peerAddr.address}:${peerAddr.port}] connected.`);

    const packet = TextPacket.from(0x1);

    peer.send(packet);
    this.base.cache.users.setSelf(netID, peer.data);
  }
}
