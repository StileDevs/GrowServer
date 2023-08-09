import { Listener } from "../abstracts/Listener";
import { BaseServer } from "../structures/BaseServer";

export default class extends Listener<"disconnect"> {
  constructor() {
    super();
    this.name = "disconnect";
  }

  public run(base: BaseServer, netID: number): void {
    console.log("Peer", netID, "disconnected");
    let peer = base.cache.users.getSelf(netID);
    peer?.leaveWorld();
    peer?.saveToDatabase();

    base.cache.users.delete(netID);
  }
}
