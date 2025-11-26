import { Peer } from "../core/Peer";
import { Base } from "../core/Base";
import { TankPacket } from "growtopia.js";
import { TankTypes } from "@growserver/const";
import { World } from "../core/World";
import { TankMap } from "./tanks/index";
import logger from "@growserver/logger";

export class ITankPacket {
  public tank;

  constructor(
    public base: Base,
    public peer: Peer,
    public chunk: Buffer,
  ) {
    this.tank = TankPacket.fromBuffer(chunk);
  }

  public async execute() {
    const tankType = this.tank.data?.type as number;
    const world = new World(this.base, this.peer.data.world);

    logger.debug(
      `[DEBUG] Receive tank packet of ${TankTypes[tankType]}: ${this.tank.parse()?.toString("hex")}`,
    );

    try {
      const type = this.tank.data?.type as number;
      const Class = TankMap[type];

      if (!Class)
        throw new Error(
          `No TankPacket class found with type ${TankTypes[type]} (${type})`,
        );

      const tnk = new Class(this.base, this.peer, this.tank, world);
      await tnk.execute();
    } catch (e) {
      logger.warn(e);
    }
  }
}
