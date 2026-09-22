import { Collection } from "../../utils/collection";

/**
 * Types of clothing slots available in Growtopia.
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
export const CLOTH_MAP: { [key in ClothTypes]: string } = {
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

export interface PlayerInventoryData {
  max: number;
  /** key: unique item id per item, value: amount (max 200 items) */
  items: Collection<number, number>;
}

/**
 * Player inventory class holding items and clothing information.
 */
export class PlayerInventory {
  /** Equipped clothing items of the player */
  public clothes: PlayerClothes = {
    hair: 0,
    shirt: 0,
    pants: 0,
    feet: 0,
    face: 0,
    hand: 0,
    back: 0,
    mask: 0,
    necklace: 0,
    ances: 0,
  };

  public inventory: PlayerInventoryData = {
    max: 32,
    items: new Collection<number, number>(),
  };

  constructor() {}

  public getInventory(): PlayerInventoryData {
    return this.inventory;
  }

  public addItem(itemId: number, amount: number): void {
    if (this.inventory.items.size >= this.inventory.max) return;
    if (amount > 200) amount = 200;
    if (amount <= 0) return;

    this.inventory.items.set(itemId, amount);
  }
}
