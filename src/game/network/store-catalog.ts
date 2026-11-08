import { Collection } from "../../utils/collection";
import { logger } from "../../utils/logger";
import { EMBEDDED_STORE_CATALOG } from "../../resources";

/** Store tabs in the order the client shows them. */
export enum StoreTab {
  HOME = 0,
  LOCKS = 1,
  ITEM_PACKS = 2,
  AWESOME_ITEMS = 3,
  WEATHER = 4,
  GROWTOKENS = 5,
}

/** Tab button id (what `buy`/`storenavigate` send) per tab. */
export const STORE_TAB_BUTTONS: Collection<string, StoreTab> = new Collection([
  ["main", StoreTab.HOME],
  ["locks", StoreTab.LOCKS],
  ["itempack", StoreTab.ITEM_PACKS],
  ["bigitems", StoreTab.AWESOME_ITEMS],
  ["weather", StoreTab.WEATHER],
  ["token", StoreTab.GROWTOKENS],
]);

export interface StoreProduct {
  tab: StoreTab;
  /** Button id sent back by the client when the product is bought. */
  button: string;
  name: string;
  texture: string;
  description: string;
  textureX: number;
  textureY: number;
  /** Gems; on the Growtoken tab the absolute value is the Growtoken price. */
  cost: number;
  /** Items granted on purchase. Empty for products that are generated (random packs, backpack upgrade). */
  items: Array<{ id: number; amount: number }>;
}

/** Products keyed by button id, in catalog order. */
export const storeProducts: Collection<string, StoreProduct> = new Collection();

/**
 * Parses the embedded catalog once. Lines starting with `#` are comments.
 */
export function loadStoreCatalog(): void {
  storeProducts.clear();
  for (const rawLine of EMBEDDED_STORE_CATALOG.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || line.startsWith("#")) continue;

    const parts = line.split("|");
    if (parts.length < 8) {
      logger.warn({ line: line.slice(0, 60) }, "skipping malformed store catalog line");
      continue;
    }

    const items: StoreProduct["items"] = [];
    for (const entry of (parts[8] ?? "").split(",")) {
      const [id, amount] = entry.split(":").map((value) => Number.parseInt(value, 10));
      if (id && amount) items.push({ id, amount });
    }

    const product: StoreProduct = {
      tab: Number.parseInt(parts[0]!, 10) as StoreTab,
      button: parts[1]!,
      name: parts[2]!,
      texture: parts[3]!,
      description: parts[4]!,
      textureX: Number.parseInt(parts[5]!, 10) || 0,
      textureY: Number.parseInt(parts[6]!, 10) || 0,
      cost: Number.parseInt(parts[7]!, 10) || 0,
      items,
    };
    storeProducts.set(product.button, product);
  }
  logger.info({ products: storeProducts.size }, "store catalog loaded");
}

/** Products of one tab in catalog order. */
export function productsForTab(tab: StoreTab): StoreProduct[] {
  return storeProducts.filter((product) => product.tab === tab);
}
