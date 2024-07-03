import type { ItemsDat } from "growtopia.js";
import { hashItemsDat } from "../utils/Utils.js";
import { readFileSync } from "fs";

export class Items {
  constructor() {}

  public static async loadCustomItems(itemsDat: ItemsDat): Promise<ItemsDat> {
    const findItem = (id: number) => itemsDat.meta.items.findIndex((v) => v.id === id);

    // id 8900-8902
    itemsDat.meta.items[findItem(8900)].extraFile = { raw: Buffer.from("interface/large/banner.rttex"), value: "interface/large/banner.rttex" };
    itemsDat.meta.items[findItem(8900)].extraFileHash = hashItemsDat(readFileSync("./assets/cache/interface/large/banner.rttex"));
    itemsDat.meta.items[findItem(8902)].extraFile = { raw: Buffer.from("interface/large/banner-transparent.rttex"), value: "interface/large/banner-transparent.rttex" };
    itemsDat.meta.items[findItem(8902)].extraFileHash = hashItemsDat(readFileSync("./assets/cache/interface/large/banner-transparent.rttex"));

    return itemsDat;
  }
}
