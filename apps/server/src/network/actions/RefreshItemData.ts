import { Variant, TankPacket } from "growtopia.js";
import { TankTypes } from "@growserver/const";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { NonEmptyObject } from "type-fest";
import { deflateSync } from "zlib";
import { readFileSync } from "fs";
import { join } from "path";

export class RefreshItemData {
  constructor(
    public base: Base,
    public peer: Peer,
  ) {}

  public async execute(
    _action: NonEmptyObject<Record<string, string>>,
  ): Promise<void> {
    // Check if platformID is "2" (macOS) and load appropriate items.dat
    const isMacOS = this.peer.data.platformID === "2";

    let itemsContent: Buffer;

    if (isMacOS) {
      // Load macOS items.dat at runtime
      const datDir = join(process.cwd(), ".cache", "growtopia", "dat");
      const macosItemsDatName = this.base.cdn.itemsDatName.replace(
        ".dat",
        "-osx.dat",
      );
      itemsContent = readFileSync(join(datDir, macosItemsDatName));
    } else {
      // Use regular items.dat already loaded in memory
      itemsContent = this.base.items.content;
    }

    this.peer.send(
      Variant.from(
        "OnConsoleMessage",
        `One moment. Updating item data${isMacOS ? " (macOS)" : ""}...`,
      ),
      TankPacket.from({
        type: TankTypes.SEND_ITEM_DATABASE_DATA,
        info: itemsContent.length,
        data: () => deflateSync(itemsContent),
      }),
    );
  }
}
