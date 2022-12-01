import { Peer, TextPacket } from "growsockets";
import { Listener } from "../abstracts/Listener";
import { BaseServer } from "../structures/BaseServer";

export default class extends Listener<"connect"> {
  constructor() {
    super();
    this.name = "connect";
  }

  public run(base: BaseServer, netID: number): void {
    console.log("Peer", netID, "connected.");

    const peer = Peer.new(base.server, netID);
    const packet = TextPacket.from(0x1);

    peer.send(packet);
  }
}
