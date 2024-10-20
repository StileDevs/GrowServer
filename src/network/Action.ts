import consola from "consola";
import { Peer } from "../core/Peer.js";
import { Base } from "../core/Base.js";
import { parseAction } from "../utils/Utils.js";

export class ActionPacket {
  public obj: Record<string, string | number>;

  constructor(public base: Base, public peer: Peer, public chunk: Buffer) {
    this.obj = parseAction(chunk);
  }

  public async execute() {
    consola.debug("ACTION", this.obj);
  }
}
