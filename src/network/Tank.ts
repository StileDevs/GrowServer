import consola from "consola";
import { Peer } from "../core/Peer.js";
import { Base } from "../core/Base.js";
import { TankPacket } from "growtopia.js";
import { TankTypes } from "../Constants.js";
import { World } from "../core/World.js";
import { TankMap } from "./tanks/index.js";

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

    try {
      const type = this.tank.data?.type as number;
      let Class = TankMap[type];

      if (!Class) throw new Error(`No TankPacket class fopund with type ${TankTypes[type]} (${type})`);

      const tnk = new Class(this.base, this.peer, this.tank, world);
      await tnk.execute();
    } catch (e) {
      consola.warn(e);
    }
  }
}
