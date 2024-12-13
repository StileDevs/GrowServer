export interface Block {
  fg: number;
  bg: number;
  x: number;
  y: number;
  lock?: LockedBlocked;
  door?: Door;
  sign?: Sign;
  heartMonitor?: HeartMonitor;
  dblockID?: number;
  damage?: number;
  resetStateAt?: number;
  worldLock?: boolean;
  boombox?: Toggleable;
  rotatedLeft?: boolean;
  entrace?: Entrance;
  tree?: Tree;
  toggleable?: Toggleable;
  mannequin?: Mannequin;
  dice?: number;
  provider?: Provider;
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

export interface WorldData {
  name: string;
  width: number;
  height: number;
  blocks: Block[];
  owner?: WorldOwnerData;
  admins?: number[];
  playerCount?: number;
  bpm?: number;
  customMusicBlocksDisabled?: boolean;
  invisMusicBlocks?: boolean;
  jammers?: Jammer[];
  dropped?: Dropped;
  weatherId: number;
}
export interface WorldOwnerData {
  name: string;
  displayName: string;
  id: number;
}

export interface LockedBlocked {
  ownerFg?: number;
  ownerUserID?: number;
  ownerName?: string;
  ownerX?: number;
  ownerY?: number;
  isOwner?: boolean;
  openToPublic?: boolean;
  ignoreEmptyAir?: boolean;
  onlyAllowBuild?: boolean;
  adminLimited?: boolean;
  adminIDs?: number[];
}

export interface Door {
  label?: string;
  destination?: string;
  id?: string;
  locked?: boolean;
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
}

export interface HeartMonitor {
  name: string;
  userID: number;
}

export interface Toggleable {
  open?: boolean;
  public?: boolean;
  silenced?: boolean;
}

export interface EnterArg {
  x?: number;
  y?: number;
}

export interface Lock {
  id: number;
  maxTiles: number;
}

export interface Ignore {
  blockIDsToIgnoreByLock: number[];
  blockActionTypesToIgnore: number[];
}
