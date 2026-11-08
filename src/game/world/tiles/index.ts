import { TANK_PACKET_TYPE } from "../../../constants";
import { ExtendBuffer } from "../../../utils/extend-buffer";
import { getItem } from "../../item/item-utils";
import { GameUpdatePacket } from "../../packets/game-packet";
import { Tile } from "../tile";
import { ActionTypes } from "../constants";
import type { TileData } from "../types";
import type { World } from "../world";
import { DoorTile } from "./door-tile";
import { SignTile } from "./sign-tile";
import { SeedTile } from "./seed-tile";
import { LockTile } from "./lock-tile";
import { DiceTile } from "./dice-tile";
import { DisplayBlockTile } from "./display-block-tile";
import { HeartMonitorTile } from "./heart-monitor-tile";
import { SwitcheROO } from "./switcheroo-tile";
import { WeatherTile } from "./weather-tile";
import { VendingTile } from "./vending-tile";
import { EntranceTile } from "./entrance-tile";
import { VipEntranceTile } from "./vip-entrance-tile";
import { AntigravityTile } from "./antigravity-tile";
import { DefaultExtraTile, getDefaultExtra, UNSUPPORTED_EXTRA_TYPES } from "./default-extra-tile";
import { ITEM_ID } from "../constants";
// dialog modules register their dialog returns on import
import "./lock-dialogs";
import "./vending-dialog";

type TileClass = new (world: World, data: TileData) => Tile;

/** Tile behaviour per item action type. Types without an entry are plain tiles. */
export const TileMap: Partial<Record<number, TileClass>> = {
  [ActionTypes.DOOR]: DoorTile,
  [ActionTypes.MAIN_DOOR]: DoorTile,
  [ActionTypes.PORTAL]: DoorTile,
  [ActionTypes.SIGN]: SignTile,
  [ActionTypes.SEED]: SeedTile,
  [ActionTypes.LOCK]: LockTile,
  [ActionTypes.DICE]: DiceTile,
  [ActionTypes.DISPLAY_BLOCK]: DisplayBlockTile,
  [ActionTypes.HEART_MONITOR]: HeartMonitorTile,
  [ActionTypes.SWITCHEROO]: SwitcheROO,
  // music blocks, amplifier and other on/off blocks: punch to toggle
  [ActionTypes.BOOMBOX]: SwitcheROO,
  // World Architect: toggles the client's grid overlay
  [ActionTypes.ARCHITECT_MACHINE]: SwitcheROO,
  [ActionTypes.WEATHER_MACHINE]: WeatherTile,
  [ActionTypes.WEATHER_SPECIAL]: WeatherTile,
  [ActionTypes.WEATHER_SPECIAL2]: WeatherTile,
  [ActionTypes.VENDING_MACHINE]: VendingTile,
  [ActionTypes.GATEWAY]: EntranceTile,
  [ActionTypes.VIP_ENTRANCE]: VipEntranceTile,
};

/** Tile behaviour for single items whose action type is shared with plain blocks. */
export const TileMapByItem: Partial<Record<number, TileClass>> = {
  [ITEM_ID.ANTIGRAVITY_GENERATOR]: AntigravityTile,
};

/**
 * Action types that carry tile extra data but have no handler ported yet.
 * Placing them is refused so the world never contains a tile the server
 * cannot serialize (a missing payload crashes the client on world load).
 */
export const PENDING_EXTRA_TYPES: ReadonlySet<number> = new Set([
  ActionTypes.PROVIDER,
  ActionTypes.CHEST,
  ActionTypes.TREASURE,
]);

/**
 * Whether an item may be placed with the current tile handlers.
 */
export function isPlaceableType(actionType: number): boolean {
  return !UNSUPPORTED_EXTRA_TYPES.has(actionType) && !PENDING_EXTRA_TYPES.has(actionType);
}

/**
 * Builds the tile handler for a block. `actionType` overrides the type
 * derived from the foreground item (used while placing a new block).
 */
export function tileFrom(world: World, data: TileData, actionType?: number, itemId?: number): Tile {
  const type = actionType ?? getItem(data.fg)?.type ?? ActionTypes.FOREGROUND;

  // `itemId` is the block about to be placed on an empty tile
  const TileClass = TileMapByItem[itemId ?? data.fg] ?? TileMap[type];
  if (TileClass) return new TileClass(world, data);

  // No handler, but the client needs extra data for this type: send defaults
  // so it renders without crashing.
  if (getDefaultExtra(type, data.fg)) return new DefaultExtraTile(world, data);

  return new Tile(world, data);
}

/**
 * Broadcasts several tile updates in one SEND_TILE_UPDATE_DATA_MULTIPLE packet.
 */
export function tileUpdateMultiple(world: World, tiles: Tile[]): void {
  const buffer = new ExtendBuffer(0);

  for (const tile of tiles) {
    buffer.writeU32(tile.data.x);
    buffer.writeU32(tile.data.y);
    buffer.writeBytes(tile.parse().data);
  }
  buffer.writeU32(0xffffffff);

  world.broadcast(
    GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.SEND_TILE_UPDATE_DATA_MULTIPLE,
      extraData: buffer.data,
    }).parse()!,
  );
}
