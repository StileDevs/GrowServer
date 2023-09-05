import { Peer } from "../structures/Peer";

export interface Place {
  peer: Peer;
  x: number;
  y: number;
  id: number;
  isBg?: boolean;
  fruit?: number;
}

export interface WorldDB {
  name: string;
  ownedBy?: string | null;
  blockCount: number;
  blocks: Buffer;
  width: number;
  height: number;
  owner?: Buffer | null;
  dropped?: Buffer;
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
  name?: string;
  width?: number;
  height?: number;
  blockCount?: number;
  blocks?: Block[];
  owner?: {
    name: string;
    displayName: string;
    id: number;
  };
  admins?: number[];
  playerCount?: number;
  bpm?: number;
  customMusicBlocksDisabled?: boolean;
  invisMusicBlocks?: boolean;
  jammers?: Jammer[];
  dropped?: Dropped;
}

export interface LockedBlocked {
  ownerFg?: number;
  ownerUserID?: number;
  ownerX?: number;
  ownerY?: number;
  isOwner?: boolean;
  ignoreEmptyAir?: boolean;
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

export interface Boombox {
  open?: boolean;
  public?: boolean;
  silenced?: boolean;
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
  user_id: number;
}

export interface Block {
  fg?: number;
  bg?: number;
  x?: number;
  y?: number;
  lock?: LockedBlocked;
  door?: Door;
  sign?: Sign;
  heartMonitor?: HeartMonitor;
  dblockID?: number;
  damage?: number;
  resetStateAt?: number;
  worldLock?: boolean;
  boombox?: Boombox;
  rotatedLeft?: boolean;
  entrace?: Entrance;
  tree?: Tree;
}

export interface EnterArg {
  x?: number;
  y?: number;
}

export interface GetBlockArg {
  x: number;
  y: number;
  peer: Peer;
}
