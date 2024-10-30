import consola from "consola";
import { Peer } from "../core/Peer.js";
import { Base } from "../core/Base.js";
import { TankPacket } from "growtopia.js";
import { TankTypes } from "../Constants.js";
import { tankParse } from "./tanks/index.js";
import { World } from "../core/World.js";

export class ITankPacket {
  public tank;

  constructor(public base: Base, public peer: Peer, public chunk: Buffer) {
    this.tank = TankPacket.fromBuffer(chunk);
  }

  public async execute() {
    const tankType = this.tank.data?.type as number;
    const world = new World(this.base, this.peer.data.world);

    if (this.tank.data?.type === 0) return;
    consola.debug(`[DEBUG] Receive tank packet of ${TankTypes[tankType]}:\n`, this.tank);
    tankParse(this.base, this.peer, this.tank, world);
  }
}
