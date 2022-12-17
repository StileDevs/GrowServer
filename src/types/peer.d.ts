export interface InventoryItems {
  id: number;
  amount: number;
}

export interface PeerDataType {
  x?: number;
  y?: number;
  world: string;
  inventory?: {
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
  clothing?: Clothing;
}

export interface Clothing {
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
