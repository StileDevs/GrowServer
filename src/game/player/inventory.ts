import { Packet, PacketKind } from "growtopia.wasm";
import { TANK_PACKET_FLAGS, TANK_PACKET_TYPE } from "../../constants";
import { Collection } from "../../utils/collection";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { GameUpdatePacket } from "../packets/game-packet";
import type { Player } from "./index";

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

/**
 * Represents a single item entry in the player's inventory.
 */
export interface InventoryItem {
  id: number;
  amount: number;
  flags: number; // 0x01 if equipped/wearing, 0x00 otherwise
}

/**
 * Manages player inventory items, clothing, binary serialization, and network sync.
 */
export class PlayerInventory {
  /** Maximum inventory slots capacity */
  public capacity = 32;

  /** Collection of inventory items keyed by Item ID */
  public items: Collection<number, InventoryItem> = new Collection();

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

  constructor(public player?: Player) {
    // Default starting tools for any player: Fist (18) and Wrench (32)
    this.addItem(18, 1, false);
    this.addItem(32, 1, false);
  }

  public get size(): number {
    return this.items.size;
  }

  public get max(): number {
    return this.capacity;
  }

  public set max(val: number) {
    this.capacity = val;
  }

  /**
   * Retrieves an item entry by item ID.
   */
  public getItem(itemId: number): InventoryItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Checks if the player has at least a specific amount of an item.
   */
  public hasItem(itemId: number, count = 1): boolean {
    const item = this.items.get(itemId);
    return item !== undefined && item.amount >= count;
  }

  /**
   * Checks if there is inventory room to fit an item.
   */
  public haveRoomForItem(itemId: number, count = 1, maxCanHold = 200): boolean {
    const existing = this.items.get(itemId);
    if (existing) {
      return existing.amount + count <= maxCanHold;
    }
    return count <= maxCanHold && this.items.size + 1 <= this.capacity;
  }

  /**
   * Gets how many more of an item can fit into the inventory.
   */
  public getFitItemCount(itemId: number, maxCanHold = 200): number {
    const existing = this.items.get(itemId);
    if (!existing) {
      return this.items.size < this.capacity ? maxCanHold : 0;
    }
    if (existing.amount >= maxCanHold) return 0;
    return maxCanHold - existing.amount;
  }

  /**
   * Checks if the player is currently wearing/equipping an item.
   */
  public isWearingItem(itemId: number): boolean {
    return (
      this.clothes.hair === itemId ||
      this.clothes.shirt === itemId ||
      this.clothes.pants === itemId ||
      this.clothes.feet === itemId ||
      this.clothes.face === itemId ||
      this.clothes.hand === itemId ||
      this.clothes.back === itemId ||
      this.clothes.mask === itemId ||
      this.clothes.necklace === itemId ||
      this.clothes.ances === itemId
    );
  }

  /**
   * Adds an item to the player's inventory and optionally sends an incremental packet update.
   */
  public addItem(itemId: number, count = 1, sendUpdate = true, maxCanHold = 200): number {
    if (count <= 0) return 0;

    const existing = this.items.get(itemId);
    if (existing) {
      const space = maxCanHold - existing.amount;
      if (space <= 0) return 0;

      const toAdd = Math.min(count, space);
      existing.amount += toAdd;

      if (sendUpdate) {
        this.sendUpdate(itemId, toAdd, true);
      }
      return toAdd;
    }

    // New item slot
    if (this.items.size + 1 > this.capacity) return 0;

    const toAdd = Math.min(count, maxCanHold);
    const isWearing = this.isWearingItem(itemId);

    this.items.set(itemId, {
      id: itemId,
      amount: toAdd,
      flags: isWearing ? 1 : 0,
    });

    if (sendUpdate) {
      this.sendUpdate(itemId, toAdd, true);
    }
    return toAdd;
  }

  /**
   * Removes an item from the player's inventory and optionally sends an incremental packet update.
   */
  public removeItem(itemId: number, count = 1, sendUpdate = true): number {
    if (count <= 0) return 0;

    const existing = this.items.get(itemId);
    if (!existing) return 0;

    const toRemove = Math.min(count, existing.amount);
    existing.amount -= toRemove;

    if (existing.amount <= 0) {
      this.items.delete(itemId);
    }

    if (sendUpdate) {
      this.sendUpdate(itemId, toRemove, false);
    }
    return toRemove;
  }

  /**
   * Serializes the inventory into the binary format expected by Growtopia's SEND_INVENTORY_STATE.
   */
  public serialize(): Buffer {
    const buf = new ExtendBuffer(7 + this.items.size * 4);

    // Header: version (1 byte), capacity (4 bytes), itemCount (2 bytes)
    buf.writeU8(0x01); // version 1
    buf.writeU32(this.capacity);
    buf.writeU16(this.items.size);

    for (const item of this.items.values()) {
      buf.writeU16(item.id);
      buf.writeU8(item.amount);
      buf.writeU8(item.flags);
    }

    return buf.toBuffer();
  }

  /**
   * Deserializes inventory data from a binary buffer.
   */
  public deserialize(buffer: Buffer | Uint8Array): void {
    const buf = new ExtendBuffer(Array.from(buffer));
    const version = buf.readU8();
    this.capacity = buf.readU32();
    const itemCount = version > 0 ? buf.readU16() : buf.readU8();

    this.items.clear();
    for (let i = 0; i < itemCount; i++) {
      const id = buf.readU16();
      const amount = buf.readU8();
      const flags = buf.readU8();
      this.items.set(id, { id, amount, flags });
    }
  }

  /**
   * Sends the full inventory state packet (SEND_INVENTORY_STATE) to the player's client.
   */
  public sendInventory(): void {
    if (!this.player) return;

    const invBuffer = this.serialize();
    const tank = GameUpdatePacket.from({
      type: TANK_PACKET_TYPE.SEND_INVENTORY_STATE,
      objectType: 0,
      jumpCount: 0,
      buildRange: 0,
      netID: -1,
      targetNetID: 0,
      flags: TANK_PACKET_FLAGS.EXTENDED_DATA,
      float_var: 0,
      itemID: 0,
      posX: 0,
      posY: 0,
      speedX: 0,
      speedY: 0,
      particleID: 0,
      tileX: 0,
      tileY: 0,
      extraDataLength: invBuffer.length,
      extraData: Array.from(invBuffer),
    }).parse()!;

    this.player.send(new Packet(tank, PacketKind.Reliable));
  }

  /**
   * Sends a delta update for a single item (MODIFY_ITEM_INVENTORY) to the client.
   */
  public sendUpdate(itemId: number, amount: number, isAdded: boolean): void {
    if (!this.player) return;

    const tank = GameUpdatePacket.from({
      type: TANK_PACKET_TYPE.MODIFY_ITEM_INVENTORY,
      objectType: isAdded ? 0 : amount,
      jumpCount: isAdded ? amount : 0,
      buildRange: 0,
      netID: -1,
      targetNetID: 0,
      flags: 0,
      float_var: 0,
      itemID: itemId,
      posX: 0,
      posY: 0,
      speedX: 0,
      speedY: 0,
      particleID: 0,
      tileX: 0,
      tileY: 0,
      extraDataLength: 0,
      extraData: [],
    }).parse()!;

    this.player.send(new Packet(tank, PacketKind.Reliable));
  }
}
