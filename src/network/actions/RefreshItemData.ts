import { Variant, TankPacket } from "growtopia.js";
import { TankTypes } from "../../Constants.js";
import { Base } from "../../core/Base.js";
import { Peer } from "../../core/Peer.js";
import { NonEmptyObject } from "type-fest";

export class RefreshItemData {
  constructor(public base: Base) {}

  public async execute(peer: Peer, action: NonEmptyObject<{ action: string }>): Promise<void> {
    peer.send(Variant.from("OnConsoleMessage", "One moment. Updating item data..."), TankPacket.from({ type: TankTypes.SEND_ITEM_DATABASE_DATA, data: () => this.base.items.content }));
  }
}
