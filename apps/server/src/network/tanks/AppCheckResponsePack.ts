import { TankPacket } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";

export class AppCheckResponsePack {
  constructor(
    public base: Base,
    public peer: Peer,
    public tank: TankPacket,
    public world: World
  ) {}

  public async execute() {
    // Client validation
    console.log("Executing AppCheckResponsePack...");
    if (this.tank.data?.type === 24) {
      console.log("Valid APP_CHECK_RESPONSE packet received.");
      if (this.peer.isValid()) {
        console.log("Peer is valid.");
      } else {
        console.log("Peer is invalid. Disconnecting...");
        this.peer.disconnect();
      }
    } else {
      console.log("Invalid APP_CHECK_RESPONSE packet received.");
    }
  }
}
