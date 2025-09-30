import consola from "consola";
import { Peer } from "../core/Peer";
import { Base } from "../core/Base";
import { parseAction } from "../utils/Utils";
import { ActionMap } from "./actions/index";

export class IActionPacket {
  public obj: Record<string, string>;

  constructor(
    public base: Base,
    public peer: Peer,
    public chunk: Buffer
  ) {
    this.obj = parseAction(chunk);
  }

  public async execute() {
    if (!this.obj.action) return;
    consola.debug("[DEBUG] Receive action packet:\n", this.obj);

    const actionType = this.obj.action.toLowerCase();

    try {
      const Class = ActionMap[actionType];

      if (!Class)
        throw new Error(`No Action class found with action name ${actionType}`);

      const action = new Class(this.base, this.peer);
      await action.execute(this.obj);
    } catch (e) {
      consola.warn(e);
    }
  }
}
