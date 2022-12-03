import { Variant } from "growsockets";
import { Peer } from "../structures/Peer";
import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { ActionType } from "../types/action";

export default class extends Action {
  constructor() {
    super();
    this.config = {
      eventName: "enter_game"
    };
  }

  public handle(base: BaseServer, peer: Peer, action: ActionType<{ action: string }>): void {
    const tes = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("Hello", "1000", "big")
      .addSpacer("small")
      .addTextBox("Welcome to GrowServer")
      .addQuickExit()
      .str();
    peer.send(
      Variant.from("OnRequestWorldSelectMenu"),
      Variant.from(
        "OnConsoleMessage",
        `Welcome \`1${
          base.cache.users.get(peer.data.netID)?.data.tankIDName
        }\`\`. Where would you like to go?`
      ),
      Variant.from({ delay: 100 }, "OnDialogRequest", tes)
    );
  }
}
