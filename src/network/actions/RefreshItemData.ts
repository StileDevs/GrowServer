import { Variant, TankPacket } from "growtopia.js";
import { TankTypes } from "../../Constants";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { NonEmptyObject } from "type-fest";

export class RefreshItemData {
  constructor(
    public base: Base,
    public peer: Peer
  ) {}

  public async execute(
    _action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    this.peer.send(
      Variant.from("OnConsoleMessage", "One moment. Updating item data..."),
      TankPacket.from({
        type: TankTypes.SEND_ITEM_DATABASE_DATA,
        data: () => this.base.items.content
      })
    );
  }
}
