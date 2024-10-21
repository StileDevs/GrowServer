import { Variant, TankPacket } from "growtopia.js";
import { TankTypes } from "../../Constants.js";
import { Base } from "../../core/Base.js";
import { Peer } from "../../core/Peer.js";

export class RefreshItemData {
  constructor(public base: Base) {}

  public async execute(peer: Peer, action: Record<string, { action: string }>): Promise<void> {
    peer.send(Variant.from("OnConsoleMessage", "One moment. Updating item data..."), TankPacket.from({ type: TankTypes.SEND_ITEM_DATABASE_DATA, data: () => this.base.items.content }));
  }
}
