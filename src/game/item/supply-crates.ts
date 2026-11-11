import { getItem } from "./item-utils";
import { items } from "./item-info";
import { Collection } from "../../utils/collection";
import { logger } from "../../utils/logger";

/** A fixed drop from a Grow4Good supply crate. */
export interface SupplyDrop {
  itemId: number;
  amount: number;
}

export type SupplyItem = readonly [number | string, number];

/**
 * The five Grow4Good supply crates, plus their Voucher Dayz counterparts.
 * Each yields all listed supplies upon being broken (not a random selection).
 * Amounts follow the post-2022 item descriptions on Growtopia Wiki.
 */
const CRATE_LOOT: Readonly<Record<number, readonly SupplyItem[]>> = {
  // Startopia
  10834: [
    ["AI Brain", 2], ["Cyborg Diplomat", 2], ["Galactibolt", 2],
    ["Gigablaster", 2], ["Growton Torpedo", 2], ["HyperShields", 2],
    ["Quadriscanner", 2], ["Space Meds", 2], ["Star Supplies", 2],
    ["Stellar Documents", 2], ["Tactical Drone", 2], ["Teleporter Charge", 2],
  ],
  // Surgery: one Surg-E and five of each standard tool.
  10836: [
    [4296, 1], [1258, 5], [1260, 5], [1262, 5], [1264, 5], [1266, 5],
    [1268, 5], [1270, 5], [4318, 5], [4312, 5], [4308, 5], [4314, 5],
    [4310, 5], [4316, 5],
  ],
  // Fishing
  10838: [
    [2914, 25], ["Shiny Flashy Thing", 15], ["Salmon Eggs", 10],
    ["Fishing Fly", 5], ["Shrimp Lure", 2], ["Whizmo Gizmo", 1],
  ],
  // Cooking: six recipe cards and 17 basic ingredients, one of each.
  10840: [
    [10844, 1], [10846, 1], [10848, 1], [10850, 1], [10852, 1], [10854, 1],
    ...[
      "Apple", "Bacon", "Blueberry", "Chicken Meat", "Dough", "Egg",
      "Fish Chunk", "Flour", "Green Beer", "Ground Beef", "Honey",
      "Lettuce", "Milk", "Onion", "Potato", "Rice", "Tomato",
    ].map((name): SupplyItem => [name, 1]),
  ],
  // Superhero: a Crime Wave and one of every standard card.
  10842: [
    ["Crime Wave", 1],
    ...[
      "Heat Vision", "Incinerate", "Flame On!", "Liquify", "Overheat",
      "Ice Shards", "Frost Breath", "Ice Barrier", "Puddle",
      "Frozen Mirror", "Super Strength", "Super Speed", "Enrage",
      "Crush", "Regeneration", "Shocking Fist", "Thunderstorm",
      "Overcharge", "Megawatt Pulse", "Resuscitate",
    ].map((name): SupplyItem => [`Superpower - ${name}`, 1]),
  ],
};

const VOUCHER_CRATE_ALIASES: Readonly<Record<number, number>> = {
  10884: 10836, // Voucher Dayz Surgery Supply Crate
  10916: 10834, // Voucher Dayz Startopia Supply Crate
  10918: 10840, // Voucher Dayz Cooking Crate
  10920: 10842, // Voucher Dayz Super Hero Crate
};

/** Recognizes the crate block IDs without depending on a loaded items.dat. */
export function isSupplyCrate(id: number): boolean {
  return id in CRATE_LOOT || id in VOUCHER_CRATE_ALIASES;
}

/** Exact post-2022 item/amount manifest, also available for regression tests. */
export function getSupplyCrateManifest(crateId: number): readonly SupplyItem[] {
  return CRATE_LOOT[VOUCHER_CRATE_ALIASES[crateId] ?? crateId] ?? [];
}

/** Resolve item names lazily after items.dat is loaded, without guessing IDs. */
function itemNameIndex(): Collection<string, number> {
  const index = new Collection<string, number>();
  if (!items?.meta?.items) return index;
  for (const [id, item] of items.meta.items) {
    if (!item.name || id % 2 !== 0) continue; // skip item seeds
    index.set(item.name.trim().toLowerCase(), id);
  }
  return index;
}

/** Returns a fresh list of valid drops; skips unknown items instead of sending broken item IDs. */
export function getSupplyCrateDrops(crateId: number): SupplyDrop[] {
  const loot = getSupplyCrateManifest(crateId);
  if (loot.length === 0) return [];
  const index = itemNameIndex();
  const result: SupplyDrop[] = [];
  for (const [item, amount] of loot) {
    const itemId = typeof item === "number" ? item : index.get(item.toLowerCase());
    if (itemId === undefined || !getItem(itemId)) {
      logger.warn({ crateId, item }, "supply crate item missing from items.dat");
      continue;
    }
    result.push({ itemId, amount });
  }
  return result;
}
