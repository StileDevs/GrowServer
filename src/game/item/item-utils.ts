import type { ItemDefinition } from "grow-items";
import { items } from "./item-info";

/**
 * Looks up an item definition from the loaded items.dat by numeric ID.
 */
export function getItem(id: number): ItemDefinition | undefined {
  return items?.meta.items.get(id);
}

/**
 * Looks up an item definition and throws when it does not exist.
 */
export function requireItem(id: number): ItemDefinition {
  const item = getItem(id);
  if (!item) throw new Error(`unknown item id ${id}`);
  return item;
}

/**
 * Returns the seed ID of a block (blocks use even IDs, their seed is the next odd ID).
 */
export function seedIdOf(blockId: number): number {
  return blockId % 2 === 0 ? blockId + 1 : blockId;
}
