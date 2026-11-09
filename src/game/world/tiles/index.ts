import { TANK_PACKET_TYPE } from "../../../constants";
import { ExtendBuffer } from "../../../utils/extend-buffer";
import { getItem } from "../../item/item-utils";
import { GameUpdatePacket } from "../../packets/game-packet";
import { Tile } from "../tile";
import { ActionTypes } from "../constants";
import type { TileData } from "../types";
import type { World } from "../world";
import type { Player } from "../../player";
import { DoorTile } from "./door-tile";
import { SignTile } from "./sign-tile";
import { SeedTile } from "./seed-tile";
import { LockTile } from "./lock-tile";
import { DiceTile } from "./dice-tile";
import { DisplayBlockTile } from "./display-block-tile";
import { HeartMonitorTile } from "./heart-monitor-tile";
import { MusicAmplifierTile, MusicBlockTile, SwitcheROO } from "./switcheroo-tile";
import { WeatherTile } from "./weather-tile";
import { VendingTile } from "./vending-tile";
import { EntranceTile } from "./entrance-tile";
import { VipEntranceTile } from "./vip-entrance-tile";
import { AntigravityTile } from "./antigravity-tile";
import { RouletteTile } from "./roulette-tile";
import { XenoniteTile } from "./xenonite-tile";
import { ProviderTile } from "./provider-tile";
import { GeigerChargerTile } from "./geiger-charger-tile";
import { LobsterTrapTile } from "./lobster-trap-tile";
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
  [ActionTypes.XENONITE]: XenoniteTile,
  [ActionTypes.PROVIDER]: ProviderTile,
  [ActionTypes.GEIGER_CHARGER]: GeigerChargerTile,
  [ActionTypes.LOBSTER_TRAP]: LobsterTrapTile,
};

/** Tile behaviour for single items whose action type is shared with plain blocks. */
export const TileMapByItem: Partial<Record<number, TileClass>> = {
  [ITEM_ID.ANTIGRAVITY_GENERATOR]: AntigravityTile,
  // record players / pianos / jukeboxes share the decorative animated type,
  // so they are mapped by item: punch toggles the tune
  [ITEM_ID.MUSIC_AMPLIFIER]: MusicAmplifierTile,
  [ITEM_ID.MYSTIC_RECORD_PLAYER]: MusicBlockTile,
  [ITEM_ID.ORGAN_PIANO]: MusicBlockTile,
  [ITEM_ID.VINTAGE_JUKEBOX]: MusicBlockTile,
  [ITEM_ID.KARAOKE_MACHINE]: MusicBlockTile,
  [ITEM_ID.WINDUP_MUSICAL_BOX]: MusicBlockTile,
  [ITEM_ID.HARMONIPAN]: MusicBlockTile,
  [ITEM_ID.BLENDER_BOP]: MusicBlockTile,
  [ITEM_ID.DANCING_SNOW_GLOBE]: MusicBlockTile,
  [ITEM_ID.DANCING_ZOMBIE]: MusicBlockTile,
  // the roulette wheel and the slot machine spin when punched
  [ITEM_ID.ROULETTE_WHEEL]: RouletteTile,
  [ITEM_ID.SLOT_MACHINE]: RouletteTile,
  4654: GeigerChargerTile,
  [3448]: LobsterTrapTile,
};

/**
 * Action types that carry tile extra data but have no handler ported yet.
 * Placing them is refused so the world never contains a tile the server
 * cannot serialize (a missing payload crashes the client on world load).
 */
export const PENDING_EXTRA_TYPES: ReadonlySet<number> = new Set([
  ActionTypes.CHEST,
  ActionTypes.TREASURE,
]);

/**
 * Whether an item may be placed with the current tile handlers.
 */
export function isPlaceableType(actionType: number): boolean {
  // wearable items are equipped, never turned into a block
  if (actionType === ActionTypes.CLOTHES || actionType === ActionTypes.ANCES) return false;
  return !UNSUPPORTED_EXTRA_TYPES.has(actionType) && !PENDING_EXTRA_TYPES.has(actionType);
}

/**
 * Builds the tile handler for a block. `actionType` overrides the type
 * derived from the foreground item (used while placing a new block).
 */
export function tileFrom(world: World, data: TileData, actionType?: number, itemId?: number, viewer?: Player): Tile {
  const type = actionType ?? getItem(data.fg)?.type ?? ActionTypes.FOREGROUND;

  // `itemId` is the block about to be placed on an empty tile
  const TileClass = TileMapByItem[itemId ?? data.fg] ?? TileMap[type];
  const tile = TileClass ? new TileClass(world, data) : getDefaultExtra(type, data.fg) ? new DefaultExtraTile(world, data) : new Tile(world, data);
  // some tile payloads (lock access lists) are personal to the reader
  tile.viewer = viewer;
  return tile;
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
