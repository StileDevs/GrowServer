import type { ExtendBuffer } from "../../utils/extend-buffer";

export interface WorldObjectData {
  id: number;
  itemId: number;
  posX: number;
  posY: number;
  amount: number;
  flags?: number;
}

/**
 * Represents a dropped item/object on the world floor.
 */
export class WorldObject {
  public id: number;
  public itemId: number;
  public posX: number;
  public posY: number;
  public amount: number;
  public flags: number;

  constructor(data: WorldObjectData) {
    this.id = data.id;
    this.itemId = data.itemId;
    this.posX = data.posX;
    this.posY = data.posY;
    this.amount = data.amount;
    this.flags = data.flags ?? 0;
  }

  public serialize(buf: ExtendBuffer): void {
    buf.writeU16(this.itemId);
    buf.writeFloat(this.posX);
    buf.writeFloat(this.posY);
    buf.writeU8(this.amount);
    buf.writeU8(this.flags);
    buf.writeU32(this.id);
  }

  public static deserialize(buf: ExtendBuffer): WorldObject {
    const itemId = buf.readU16();
    const posX = buf.readFloat();
    const posY = buf.readFloat();
    const amount = buf.readU8();
    const flags = buf.readU8();
    const id = buf.readU32();

    return new WorldObject({
      id,
      itemId,
      posX,
      posY,
      amount,
      flags,
    });
  }
}
