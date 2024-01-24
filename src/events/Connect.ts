import { TextPacket } from "growtopia.js";
import { Listener } from "../abstracts/Listener";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";

export default class extends Listener<"connect"> {
  constructor(base: BaseServer) {
    super(base);
    this.name = "connect";
  }

  public run(netID: number): void {
    this.base.log.debug("Peer", netID, "connected.");

    const peer = new Peer(this.base, netID);
    const packet = TextPacket.from(0x1);

    peer.send(packet);
    this.base.cache.users.setSelf(netID, peer.data);
  }
}
