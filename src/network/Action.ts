import consola from "consola";
import { Peer } from "../core/Peer.js";
import { Base } from "../core/Base.js";
import { parseAction } from "../utils/Utils.js";
import { Collection } from "../utils/Collection.js";
import { readdirSync } from "fs";
import { ActionMap } from "./actions/index.js";

export class IActionPacket {
  public obj: Record<string, string | number>;

  constructor(public base: Base, public peer: Peer, public chunk: Buffer) {
    this.obj = parseAction(chunk);
  }

  public async execute() {
    if (!this.obj.action) return;
    consola.debug("[DEBUG] Receive action packet:\n", this.obj);

    const actionType = this.obj.action;

    try {
      const Class = ActionMap[actionType];

      if (!Class) throw new Error(`No Action class found with action name ${actionType}`);

      const action = new Class(this.base);
      await action.execute(this.peer, this.obj);
    } catch (e) {
      consola.error(e);
    }
  }
}
