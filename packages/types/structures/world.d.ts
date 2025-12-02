import type { JammerEffect, LockPermission } from "@growserver/const";
import type { ExtendBuffer } from "@growserver/utils";


export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface Coordinate {
  x: number;
  y: number;
}

export type TileExtra = LockParent | LockChild | WorldLockData | Door | Sign | HeartMonitor | Entrace | Tree | Mannequin | Dice | Provider | DisplayBlock | Jammer;

export interface TileData {
  fg: number;
  bg: number;
  parent: Coordinate;
  parentLock?: Coordinate;
  flags: number;
}

export interface Provider {
  date: number;
}

export interface Mannequin {
  label: string;
  hairColor: number;
  unknown_u8?: number;
  hair: number;
  shirt: number;
  pants: number;
  feet: number;
  face: number;
  hand: number;
  back: number;
  mask: number;
  neck: number;
}

export interface Jammer {
  type: JammerEffect;
  enabled: boolean;
}

export interface BlockPosition {
  x: number;
  y: number;
}

export interface DroppedItem {
  id: number;
  amount: number;
  x: number;
  y: number;
  uid: number;
  createdAt: Date;
}

export interface Dropped {
  uidCount: number;
  items: DroppedItem[];
}

export interface WeatherData {
  id: number;
  heatWave: RGB;
}


export interface WorldDataTileExtra  extends Coordinate {
  id: number;
  data: TileExtra;
}

export interface WorldOwnerData {
  userId: string;
  worldLock: Coordinate
}


export interface WorldData {
  name: string;
  width: number;
  height: number;
  tileMap: ExtendBuffer;
  tileExtras: WorldDataTileExtra[];
  playerCount?: number;
  dropped: Dropped;
  weather: WeatherData;
}


// the tile that LockParent owns
export interface LockChild {
  parentX: number; // the lock X
  parentY: number; // the lock Y
}

// contains all WorldLock specific configuration.
export interface WorldLockData {
  bpm: number;
  customMusicBlocksDisabled: boolean;
  invisMusicBlocks: boolean;
  minLevel: number;
}

// the lock itself
export interface LockParent {
  ownerUserID: number;
  adminLimited: boolean;
  adminIDs: number[];
  ownedTiles: number[]; // Tile indexes this lock owns
  ignoreEmptyAir: boolean;
  permission: LockPermission; // this is available exclusively to the actual Lock(small lock, huge lock, etc), not locked tile
}

export interface Door {
  label?: string;
  destination?: string;
  id?: string;
}

export interface Sign {
  label?: string;
}

export interface Entrance {
  open?: boolean;
}

export interface Tree {
  fruit: number;
  fruitCount: number;
  fullyGrownAt: number;
  plantedAt: number;
  isSpliced: boolean;
}

export interface HeartMonitor {
  userID: number;
}

export interface DisplayBlock {
  displayedItem: number;
}

export interface Dice {
  symbol: number;
  lastRollTime: number; // limit dice rolling to 1 time per 3 seconds.
}

export interface EnterArg {
  x?: number;
  y?: number;
}

export interface Ignore {
  blockIDsToIgnoreByLock: number[];
  blockActionTypesToIgnore: number[];
}
