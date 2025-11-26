import { Peer } from "../core/Peer";
import { Base } from "../core/Base";
import { parseAction } from "@growserver/utils";
import { ActionMap } from "./actions/index";
import logger from "@growserver/logger";

export class IActionPacket {
  public obj: Record<string, string>;

  constructor(
    public base: Base,
    public peer: Peer,
    public chunk: Buffer,
  ) {
    this.obj = parseAction(chunk);
  }

  public async execute() {
    if (!this.obj.action) return;
    logger.debug(`Receive action packet:\n ${this.obj}`);

    const actionType = this.obj.action;

    try {
      const Class = ActionMap[actionType];

      if (!Class)
        throw new Error(`No Action class found with action name ${actionType}`);

      const action = new Class(this.base, this.peer);
      await action.execute(this.obj);
    } catch (e) {
      logger.warn(e);
    }
  }
}
