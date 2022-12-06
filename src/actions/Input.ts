import { Variant } from "growsockets";
import { Peer } from "../structures/Peer";
import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";
import { ActionType } from "../types/action";

export default class extends Action {
  constructor() {
    super();
    this.config = {
      eventName: "input"
    };
  }

  public handle(
    base: BaseServer,
    peer: Peer,
    action: ActionType<{ action: string; text: string }>
  ): void {
    peer.everyPeer({ sameWorld: true }, (p) => {
      p.send(
        Variant.from("OnTalkBubble", peer.data.netID, action.text, 0),
        Variant.from(
          "OnConsoleMessage",
          `CP:0_PL:0_OID:_CT:[W]_ <\`w${peer.data.tankIDName}\`\`> ${action.text}`
        )
      );
    });
  }
}
