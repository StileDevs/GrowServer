import { TextPacket } from "growsockets";
import { Listener } from "../abstracts/Listener";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";

export default class extends Listener<"connect"> {
  constructor() {
    super();
    this.name = "connect";
  }

  public run(base: BaseServer, netID: number): void {
    console.log("Peer", netID, "connected.");

    const peer = new Peer(base.server, netID, base);
    const packet = TextPacket.from(0x1);

    peer.send(packet);
  }
}
