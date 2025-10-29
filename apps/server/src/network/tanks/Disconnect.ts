import { TankPacket } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";

export class Disconnect {
  constructor(
    public base: Base,
    public peer: Peer,
    public tank: TankPacket,
    public world: World
  ) {}

  public async execute() {
    this.peer.disconnect();
  }
}
