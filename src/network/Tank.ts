import consola from "consola";
import { Peer } from "../core/Peer.js";
import { Base } from "../core/Base.js";
import { TankPacket } from "growtopia.js";
import { TankTypes } from "../Constants.js";

export class ITankPacket {
  public tank;

  constructor(public base: Base, public peer: Peer, public chunk: Buffer) {
    this.tank = TankPacket.fromBuffer(chunk);
  }

  public async execute() {
    const tankType = this.tank.data?.type as number;

    consola.debug(`[DEBUG] Receive tank packet of ${TankTypes[tankType]}:\n`, this.tank);
  }
}
