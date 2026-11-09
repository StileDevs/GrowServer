import { Collection } from "../../utils/collection";
import { getItem } from "../item/item-utils";

/**
 * Types of clothing slots available in Growtopia (items.dat `bodyPartType`).
 */
export enum ClothTypes {
  HAIR = 0,
  SHIRT = 1,
  PANTS = 2,
  FEET = 3,
  FACE = 4,
  HAND = 5,
  BACK = 6,
  MASK = 7,
  NECKLACE = 8,
  ANCES = 9,
}

/**
 * Mapping of cloth enum values to their corresponding key names.
 */
export const CLOTH_MAP: { [key in ClothTypes]: keyof PlayerClothes } = {
  [ClothTypes.ANCES]: "ances",
  [ClothTypes.BACK]: "back",
  [ClothTypes.FACE]: "face",
  [ClothTypes.FEET]: "feet",
  [ClothTypes.HAIR]: "hair",
  [ClothTypes.HAND]: "hand",
  [ClothTypes.MASK]: "mask",
  [ClothTypes.NECKLACE]: "necklace",
  [ClothTypes.PANTS]: "pants",
  [ClothTypes.SHIRT]: "shirt",
};

/**
 * Player clothing items representation.
 */
export interface PlayerClothes {
  hair: number;
  shirt: number;
  pants: number;
  feet: number;
  face: number;
  hand: number;
  back: number;
  mask: number;
  necklace: number;
  ances: number;
}

/** Largest stack of one item a backpack slot can hold. */
export const MAX_ITEM_STACK = 200;
/** Backpack size for new players. */
export const DEFAULT_INVENTORY_SIZE = 32;

/** Persisted shape of the inventory (stored as JSON in `players.inventory`). */
export interface SerializedInventory {
  max: number;
  items: Array<[id: number, amount: number]>;
  clothes: PlayerClothes;
}

export function createEmptyClothes(): PlayerClothes {
  return { hair: 0, shirt: 0, pants: 0, feet: 0, face: 0, hand: 0, back: 0, mask: 0, necklace: 0, ances: 0 };
}

/**
 * Player inventory: backpack items and equipped clothes.
 */
export class PlayerInventory {
  /** Equipped clothing items of the player */
  public clothes: PlayerClothes = createEmptyClothes();

  /** Backpack capacity (number of distinct item slots). */
  public max = DEFAULT_INVENTORY_SIZE;

  /** key: item id, value: amount (max 200 per slot). */
  public items: Collection<number, number> = new Collection();

  public get isFull(): boolean {
    return this.items.size >= this.max;
  }

  public hasItem(itemId: number): boolean {
    return (this.items.get(itemId) ?? 0) > 0;
  }

  public getAmount(itemId: number): number {
    return this.items.get(itemId) ?? 0;
  }

  /**
   * Whether `amount` more of an item fits in the backpack.
   */
  public canAddItem(itemId: number, amount = 1): boolean {
    const owned = this.items.get(itemId);
    const maxAmount = getItem(itemId)?.maxAmount || MAX_ITEM_STACK;
    if (owned === undefined) return !this.isFull && amount <= maxAmount;
    return owned + amount <= maxAmount;
  }

  /**
   * Adds items to the backpack, capping the stack at 200.
   * @returns the amount actually added.
   */
  public addItem(itemId: number, amount: number): number {
    if (amount <= 0 || itemId <= 0) return 0;
    const owned = this.items.get(itemId);
    if (owned === undefined) {
      if (this.isFull) return 0;
      const added = Math.min(amount, MAX_ITEM_STACK);
      this.items.set(itemId, added);
      return added;
    }
    const added = Math.min(amount, MAX_ITEM_STACK - owned);
    if (added <= 0) return 0;
    this.items.set(itemId, owned + added);
    return added;
  }

  /**
   * Removes items from the backpack and unequips them when the stack is gone.
   * @returns the amount actually removed.
   */
  public removeItem(itemId: number, amount: number): number {
    const owned = this.items.get(itemId);
    if (owned === undefined || amount <= 0) return 0;
    const removed = Math.min(owned, amount);
    if (owned - removed <= 0) {
      this.items.delete(itemId);
      this.unequipById(itemId);
    } else {
      this.items.set(itemId, owned - removed);
    }
    return removed;
  }

  /** Whether an item is worn in any clothing slot. */
  public isEquipped(itemId: number): boolean {
    return Object.values(this.clothes).includes(itemId);
  }

  /** Clears every slot that wears the given item. */
  public unequipById(itemId: number): boolean {
    let changed = false;
    for (const key of Object.keys(this.clothes) as Array<keyof PlayerClothes>) {
      if (this.clothes[key] === itemId) {
        this.clothes[key] = 0;
        changed = true;
      }
    }
    return changed;
  }

  public serialize(): SerializedInventory {
    return {
      max: this.max,
      items: [...this.items.entries()],
      clothes: { ...this.clothes },
    };
  }

  public toBuffer(): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(this.serialize()));
  }

  /**
   * Restores the inventory from the persisted JSON blob. Invalid data keeps the
   * current state.
   */
  public load(raw: Uint8Array | string | null | undefined): boolean {
    if (!raw || raw.length === 0) return false;
    try {
      const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
      const parsed = JSON.parse(text) as Partial<SerializedInventory>;
      if (typeof parsed.max === "number" && parsed.max > 0) this.max = parsed.max;
      this.items.clear();
      for (const entry of parsed.items ?? []) {
        if (Array.isArray(entry) && typeof entry[0] === "number" && typeof entry[1] === "number" && entry[1] > 0) {
          this.items.set(entry[0], Math.min(entry[1], MAX_ITEM_STACK));
        }
      }
      this.clothes = { ...createEmptyClothes(), ...(parsed.clothes ?? {}) };
      return true;
    } catch {
      return false;
    }
  }
}
