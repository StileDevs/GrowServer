export interface PeerData {
  channelID: number;
  x?: number;
  y?: number;
  world: string;
  inventory: Inventory;
  rotatedLeft: boolean;
  requestedName: string;
  tankIDName: string;
  netID: number;
  country: string;
  userID: number;
  role: string;
  gems: number;
  growtokens?: number;
  clothing: Clothing;
  exp: number;
  level: number;
  lastCheckpoint?: CheckPoint;
  lastVisitedWorlds?: string[];
  state: PeerState;
  heartMonitors: Map<string, Array<number>>; // A map that contains the world name as the key and the array number as the list of tile index.
}

export interface PeerState {
  mod: number;
  canWalkInBlocks: boolean;
  modsEffect: number;
  lava: LavaState;
}

export interface LavaState {
  damage: number;
  resetStateAt: number;
}

export interface Inventory {
  max: number;
  items: InventoryItems[];
}

export interface InventoryItems {
  id: number;
  amount: number;
}

export interface CheckPoint {
  x: number;
  y: number;
}

export interface Clothing {
  [key: string]: number;
  shirt: number;
  pants: number;
  feet: number;
  face: number;
  hand: number;
  back: number;
  hair: number;
  mask: number;
  necklace: number;
  ances: number;
}
