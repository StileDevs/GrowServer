import { Peer, TankPacket, Variant } from "growsockets";
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
    peer: Peer<{ netID: number; tankIDName: string; requestedName: string }>,
    action: ActionType<{ action: string; text: string }>
  ): void {
    const data = base.cache.users.get(peer.data.netID)?.data;
    peer.send(
      Variant.from("OnTalkBubble", data?.netID!, action.text, 0),
      Variant.from(
        "OnConsoleMessage",
        `CP:0_PL:0_OID:_CT:[W]_ <\`w${data?.tankIDName}\`\`> ${action.text}`
      )
    );
  }
}
