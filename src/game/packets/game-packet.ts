// Extending TankPacket

import { PACKET_TYPE, TANK_HEADER_SIZE, TANK_PACKET_FLAGS, type TANK_PACKET_TYPE } from "../../constants";
import { ExtendBuffer } from "../../utils/extend-buffer";

export interface GameUpdatePacketData {
  type: TANK_PACKET_TYPE; // u8
  objectType: number; // u8
  jumpCount: number; // u8
  buildRange: number; // u8
  netID: number; // i32
  targetNetID: number; // i32
  flags: number; // i32
  float_var: number; // f32
  itemID: number; // i32
  posX: number; // f32
  posY: number; // f32
  speedX: number; // f32
  speedY: number; // f32
  particleID: number; // f32
  tileX: number; // i32
  tileY: number; // i32
  extraDataLength: number; // u32
  extraData: number[]; // u8[]
}

export class GameUpdatePacket {
  constructor(public data: GameUpdatePacketData) {}

  public static from(data: GameUpdatePacketData) {
    return new GameUpdatePacket(data);
  }

  /**
   * Creates a packet from a partial description; every unspecified field is zero.
   * `extraDataLength` is derived from `extraData` and the EXTENDED_DATA flag is
   * set automatically when extra data is present.
   */
  public static create(partial: Partial<GameUpdatePacketData> & { type: TANK_PACKET_TYPE }): GameUpdatePacket {
    const extraData = partial.extraData ?? [];
    const data: GameUpdatePacketData = {
      type: partial.type,
      objectType: partial.objectType ?? 0,
      jumpCount: partial.jumpCount ?? 0,
      buildRange: partial.buildRange ?? 0,
      netID: partial.netID ?? 0,
      targetNetID: partial.targetNetID ?? 0,
      flags: (partial.flags ?? 0) | (extraData.length > 0 ? TANK_PACKET_FLAGS.EXTENDED_DATA : 0),
      float_var: partial.float_var ?? 0,
      itemID: partial.itemID ?? 0,
      posX: partial.posX ?? 0,
      posY: partial.posY ?? 0,
      speedX: partial.speedX ?? 0,
      speedY: partial.speedY ?? 0,
      particleID: partial.particleID ?? 0,
      tileX: partial.tileX ?? 0,
      tileY: partial.tileY ?? 0,
      extraDataLength: partial.extraDataLength ?? extraData.length,
      extraData,
    };
    return new GameUpdatePacket(data);
  }

  public static fromExtendBuffer(extendBuf: ExtendBuffer): GameUpdatePacket {
    const data: GameUpdatePacketData = {
      type: extendBuf.readU8(),
      objectType: extendBuf.readU8(),
      jumpCount: extendBuf.readU8(),
      buildRange: extendBuf.readU8(),
      netID: extendBuf.readI32(),
      targetNetID: extendBuf.readI32(),
      flags: extendBuf.readI32(),
      float_var: extendBuf.readFloat(),
      itemID: extendBuf.readI32(),
      posX: extendBuf.readFloat(),
      posY: extendBuf.readFloat(),
      speedX: extendBuf.readFloat(),
      speedY: extendBuf.readFloat(),
      particleID: extendBuf.readFloat(),
      tileX: extendBuf.readI32(),
      tileY: extendBuf.readI32(),
      extraDataLength: extendBuf.readU32(),
      extraData: [],
    };

    const dataLength = data.extraDataLength;
    if (dataLength > 0) {
      data.extraData = extendBuf.readBytes(dataLength);
    }

    return new GameUpdatePacket(data);
  }

  /**
   * Creates a GameUpdatePacket instance from a raw Buffer.
   * @param buf The raw buffer containing packet data.
   * @returns A new GameUpdatePacket instance.
   */
  public static fromBuffer(buf: Buffer): GameUpdatePacket {
    const extendBuf = new ExtendBuffer(Array.from(buf));
    return GameUpdatePacket.fromExtendBuffer(extendBuf);
  }

  public parse() {
    if (!this.data) return;
    const buf = new ExtendBuffer(TANK_HEADER_SIZE);

    buf.writeU8(this.data.type);
    buf.writeU8(this.data.objectType);
    buf.writeU8(this.data.jumpCount);
    buf.writeU8(this.data.buildRange);
    buf.writeI32(this.data.netID);
    buf.writeI32(this.data.targetNetID);
    buf.writeI32(this.data.flags);
    buf.writeFloat(this.data.float_var);
    buf.writeI32(this.data.itemID);
    buf.writeFloat(this.data.posX);
    buf.writeFloat(this.data.posY);
    buf.writeFloat(this.data.speedX);
    buf.writeFloat(this.data.speedY);
    buf.writeFloat(this.data.particleID);
    buf.writeI32(this.data.tileX);
    buf.writeI32(this.data.tileY);

    buf.writeU32(this.data.extraDataLength);
    if (this.data.extraDataLength > 0) buf.writeBytes(this.data.extraData);

    const bufRes = Buffer.from(buf.data);

    return Buffer.concat([Buffer.from([PACKET_TYPE.GAME_PACKET, 0, 0, 0]), bufRes]);
  }

  public hasFlags(flags: number): boolean {
    return (this.data.flags & flags) !== 0;
  }

  public setFlags(flags: number): void {
    this.data.flags |= flags;
  }

  public clearFlags(flags: number): void {
    this.data.flags &= ~flags;
  }
}
