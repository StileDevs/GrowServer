import type { LockPermission } from "@growserver/const";

export interface TileData {
  fg: number;
  bg: number;
  x: number;
  y: number;
  flags: number;
  lock?: LockParent;
  lockedBy?: LockChild;
  worldLockData?: WorldLockData; // this stores bpm, hide music notes, etc
  door?: Door;
  sign?: Sign;
  heartMonitor?: HeartMonitor;
  // dblockID?: number;
  damage?: number; // this is a float. 1 damage is equal to 1 fist damage.
  resetStateAt?: number;
  // worldLock?: boolean;
  rotatedLeft?: boolean;
  entrace?: Entrance;
  tree?: Tree;
  mannequin?: Mannequin;
  dice?: Dice;
  provider?: Provider;
  displayBlock?: DisplayBlock;
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
  type: "zombie" | "punch" | "signal";
  enabled: boolean;
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

export interface WorldData {
  name: string;
  width: number;
  height: number;
  blocks: TileData[];
  // owner?: number; // owner userID
  // admins?: number[];
  playerCount?: number;
  // bpm?: number;
  // customMusicBlocksDisabled?: boolean;
  // invisMusicBlocks?: boolean;
  jammers?: Jammer[];
  dropped: Dropped;
  weather: WeatherData;
  worldLockIndex?: number;
  // minLevel: number;
  // openToPublic?: boolean;
}
// export interface WorldOwnerData {
//   name: string;
//   displayName: string;
//   id: number;
// }

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
