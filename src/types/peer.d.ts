import { NativePeerMethod } from "growtopia.js";

export interface InventoryItems {
  id: number;
  amount: number;
}

export interface PeerDataType {
  x?: number;
  y?: number;
  world: string;
  inventory: {
    max: number;
    items: InventoryItems[];
  };
  rotatedLeft: boolean;
  requestedName: string;
  tankIDName: string;
  netID: number;
  country: string;
  id_user: string | number;
  role: string;
  gems: number;
  clothing: Clothing;
  exp: number;
  level: number;
  lastCheckpoint?: CheckPoint;
  lastVisitedWorlds?: string[];
  state: IState;
  enet: NativePeerMethod;
}

export interface IState {
  mod: number;
  canWalkInBlocks: boolean;
  modsEffect: number;
  lava: {
    damage: number;
    resetStateAt: number;
  };
}

export interface CheckPoint {
  x: number;
  y: number;
}

export interface Clothing {
  [key: string]: number;
  hair: number;
  shirt: number;
  pants: number;
  feet: number;
  face: number;
  hand: number;
  back: number;
  mask: number;
  necklace: number;
  ances: number;
}
