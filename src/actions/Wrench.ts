import { Action } from "../abstracts/Action.js";
import { Peer } from "../structures/Peer.js";
import { BaseServer } from "../structures/BaseServer.js";
import type { ActionType } from "../types";
import { DialogBuilder } from "../utils/builders/DialogBuilder.js";
import { Variant } from "growtopia.js";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "wrench"
    };
  }

  public handle(peer: Peer, action: ActionType<{ action: string; netid: string }>): void {
    console.log(action);
    const world = peer.hasWorld(peer.data.world);
    const targetPeer = this.base.cache.users.get(parseInt(action.netid));

    if (peer.data.netID === targetPeer?.netID) {
      const dialog = new DialogBuilder()
        .defaultColor()
        .raw(`add_player_info|${peer.data.tankIDName}|${peer.data.level}|${peer.data.exp}|${100 * (peer.data.level * peer.data.level + 4)}`)
        .addTextBox(`Hello your name is ${peer.data.tankIDName}`)
        .addTextBox(`And your netID is ${peer.data.netID}`)
        .addQuickExit()
        .str();
      peer.send(Variant.from({ delay: 100 }, "OnDialogRequest", dialog));
    } else {
      const dialog = new DialogBuilder().defaultColor().addLabelWithIcon(`\`\`${targetPeer?.tankIDName} (\`2${targetPeer?.level}\`\`)`, "18", "big").addQuickExit().embed("netID", targetPeer?.netID);

      if (world?.data.owner) {
        if (world?.data.owner.id === peer.data.id_user) {
          dialog.addButton("kick", "`4Kick``");
          dialog.addButton("pull", "`5Pull```");
          dialog.addButton("worldban", "`4World Ban``");
          dialog.endDialog("wrench_popup", "", "Continue");
        }
      }

      peer.send(Variant.from({ delay: 100 }, "OnDialogRequest", dialog.str()));
    }
  }
}
