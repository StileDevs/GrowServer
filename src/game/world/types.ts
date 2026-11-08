import type { LockPermission } from "./constants";

/** Per-tile data kept by the server. Only the fields a tile needs are set. */
export interface TileData {
  fg: number;
  bg: number;
  x: number;
  y: number;
  flags: number;
  lock?: LockParent;
  lockedBy?: LockChild;
  worldLockData?: WorldLockData;
  door?: Door;
  sign?: Sign;
  heartMonitor?: HeartMonitor;
  /** Accumulated punch damage; 1 equals one fist hit. */
  damage?: number;
  /** Timestamp (ms) after which `damage` resets to 0. */
  resetStateAt?: number;
  tree?: Tree;
  dice?: Dice;
  displayBlock?: DisplayBlock;
  vending?: Vending;
  vip?: VipEntrance;
  weatherSettings?: WeatherSettings;
}

/** Players allowed through a VIP Entrance besides the lock's owner and admins. */
export interface VipEntrance {
  playerIds: number[];
}

/** Settings of the weather machines that have a wrench dialog. */
export interface WeatherSettings {
  /** Background block (Weather Machine - Background) or item to rain down (Stuff). */
  itemId?: number;
  /** Stuff: fall speed, -500..500. */
  gravity?: number;
  /** Stuff: spin the falling items. */
  spin?: boolean;
  /** Stuff: invert the sky colors. */
  invert?: boolean;
  /** Heatwave: sky color channels, 0..255. */
  red?: number;
  green?: number;
  blue?: number;
}

export interface Vending {
  itemId: number;
  count: number;
  /** > 0: world locks per item. < 0: items per world lock. 0: not for sale. */
  price: number;
  earned: number;
}

export interface BlockPosition {
  x: number;
  y: number;
}

export interface DroppedItem {
  id: number;
  amount: number;
  block: BlockPosition;
  x: number;
  y: number;
  uid: number;
}

export interface Dropped {
  uid: number;
  items: DroppedItem[];
}

export interface WeatherData {
  id: number;
}

/** Serializable world state, stored as compressed JSON in `data/worlds/`. */
export interface WorldData {
  name: string;
  width: number;
  height: number;
  blocks: TileData[];
  dropped: Dropped;
  weather: WeatherData;
  /** Block index of the world lock, if any. */
  worldLockIndex?: number;
}

/** A tile owned by an area lock: the lock's position. */
export interface LockChild {
  parentX: number;
  parentY: number;
}

export interface WorldLockData {
  bpm: number;
  customMusicBlocksDisabled: boolean;
  invisMusicBlocks: boolean;
  minLevel: number;
}

/** The lock tile itself. */
export interface LockParent {
  ownerPlayerId: number;
  adminLimited: boolean;
  adminIds: number[];
  /** Block indexes this lock owns. */
  ownedTiles: number[];
  ignoreEmptyAir: boolean;
  permission: LockPermission;
}

export interface Door {
  label?: string;
  /** `WORLDNAME:ID`, `:ID` or empty. */
  destination?: string;
  id?: string;
}

export interface Sign {
  label?: string;
}

export interface Tree {
  fruit: number;
  fruitCount: number;
  fullyGrownAt: number;
  plantedAt: number;
  isSpliced: boolean;
}

export interface HeartMonitor {
  playerId: number;
  /** Owner display name at placement time, so the tile serializes without a lookup. */
  name?: string;
}

export interface DisplayBlock {
  displayedItem: number;
}

export interface Dice {
  symbol: number;
  lastRollTime: number;
}
