import { Variant, TankPacket } from "growtopia.js";
import { TankTypes } from "../../Constants";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { NonEmptyObject } from "type-fest";
import { deflateSync } from "zlib";

export class RefreshItemData {
  constructor(
    public base: Base,
    public peer: Peer
  ) { }

  public async execute(
    _action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    // Check if platformID is "2" (macOS) and send appropriate items.dat
    const isMacOS = this.peer.data.platformID === "2";
    const itemsData = isMacOS ? this.base.macosItems : this.base.items;
    
    this.peer.send(
      Variant.from("OnConsoleMessage", `One moment. Updating item data${isMacOS ? ' (macOS)' : ''}...`),
      TankPacket.from({
        type: TankTypes.SEND_ITEM_DATABASE_DATA,
        info: itemsData.content.length,
        data: () => deflateSync(itemsData.content)
      })
    );
  }
}
