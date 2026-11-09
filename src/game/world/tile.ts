import { TILE_FLAGS, TILE_EXTRA_TYPES } from "../../constants";
import type { ExtendBuffer } from "../../utils/extend-buffer";

/**
 * Door tile extra data (main doors, normal doors, portals).
 */
export interface DoorExtraData {
  type: TILE_EXTRA_TYPES.DOOR;
  label: string;
  destination: string;
  flags?: number | undefined;
}

/**
 * Sign tile extra data.
 */
export interface SignExtraData {
  type: TILE_EXTRA_TYPES.SIGN;
  label: string;
}

/**
 * Lock tile extra data (Small, Big, Huge, World Lock).
 */
export interface LockExtraData {
  type: TILE_EXTRA_TYPES.LOCK;
  ownerId: number;
  adminIds: number[];
  settings?: number | undefined;
}

/**
 * Tree / Seed tile extra data.
 */
export interface SeedExtraData {
  type: TILE_EXTRA_TYPES.SEED;
  timePassed: number;
  fruitCount: number;
}

export type TileExtraData = DoorExtraData | SignExtraData | LockExtraData | SeedExtraData;

export interface TileData {
  x: number;
  y: number;
  fg: number;
  bg: number;
  flags: number;
  parentTileIndex?: number | undefined;
  extra?: TileExtraData | undefined;
}

/**
 * Represents a single tile on the world grid.
 */
export class Tile {
  public x: number;
  public y: number;
  public fg: number;
  public bg: number;
  public flags: number;
  public parentTileIndex: number;
  public extra?: TileExtraData | undefined;

  constructor(data: TileData) {
    this.x = data.x;
    this.y = data.y;
    this.fg = data.fg;
    this.bg = data.bg;
    this.flags = data.flags;
    this.parentTileIndex = data.parentTileIndex ?? 0;
    this.extra = data.extra;
  }

  /**
   * Serializes this tile into an ExtendBuffer.
   */
  public serialize(buf: ExtendBuffer): void {
    buf.writeU16(this.fg);
    buf.writeU16(this.bg);
    buf.writeU16(this.parentTileIndex);
    buf.writeU16(this.flags);

    if (this.flags & TILE_FLAGS.TILEEXTRA && this.extra) {
      buf.writeU8(this.extra.type);

      switch (this.extra.type) {
        case TILE_EXTRA_TYPES.DOOR: {
          buf.writeString(this.extra.label ?? "", 2);
          buf.writeU8(this.extra.flags ?? 0);
          break;
        }

        case TILE_EXTRA_TYPES.SIGN: {
          buf.writeString(this.extra.label ?? "", 2);
          buf.writeI32(-1);
          break;
        }

        case TILE_EXTRA_TYPES.LOCK: {
          buf.writeU8(this.extra.settings ?? 0);
          buf.writeU32(this.extra.ownerId);
          buf.writeU32(this.extra.adminIds?.length ?? 0);
          for (const adminId of this.extra.adminIds ?? []) {
            buf.writeU32(adminId);
          }
          break;
        }

        case TILE_EXTRA_TYPES.SEED: {
          buf.writeU32(this.extra.timePassed ?? 0);
          buf.writeU8(this.extra.fruitCount ?? 0);
          break;
        }
      }
    }
  }

  /**
   * Deserializes a tile from an ExtendBuffer at the specified coordinates.
   */
  public static deserialize(x: number, y: number, buf: ExtendBuffer): Tile {
    const fg = buf.readU16();
    const bg = buf.readU16();
    const parentTileIndex = buf.readU16();
    const flags = buf.readU16();

    let extra: TileExtraData | undefined;

    if (flags & TILE_FLAGS.TILEEXTRA) {
      const extraType = buf.readU8();

      switch (extraType) {
        case TILE_EXTRA_TYPES.DOOR: {
          const label = buf.readString(2);
          const doorFlags = buf.readU8();
          extra = {
            type: TILE_EXTRA_TYPES.DOOR,
            label,
            destination: label,
            flags: doorFlags,
          };
          break;
        }

        case TILE_EXTRA_TYPES.SIGN: {
          const label = buf.readString(2);
          buf.readI32();
          extra = {
            type: TILE_EXTRA_TYPES.SIGN,
            label,
          };
          break;
        }

        case TILE_EXTRA_TYPES.LOCK: {
          const settings = buf.readU8();
          const ownerId = buf.readU32();
          const adminCount = buf.readU32();
          const adminIds: number[] = [];
          for (let i = 0; i < adminCount; i++) {
            adminIds.push(buf.readU32());
          }
          extra = {
            type: TILE_EXTRA_TYPES.LOCK,
            settings,
            ownerId,
            adminIds,
          };
          break;
        }

        case TILE_EXTRA_TYPES.SEED: {
          const timePassed = buf.readU32();
          const fruitCount = buf.readU8();
          extra = {
            type: TILE_EXTRA_TYPES.SEED,
            timePassed,
            fruitCount,
          };
          break;
        }
      }
    }

    return new Tile({
      x,
      y,
      fg,
      bg,
      parentTileIndex,
      flags,
      extra,
    });
  }
}
