import { PeerData } from "./peer";
import { WorldData } from "./world";
import { Collection } from "../utils/Collection";
import { CooldownOptions } from "./commands";

export interface CDNContent {
  version: string;
  uri: string;
}

export interface Cache {
  peers: Collection<number, PeerData>;
  worlds: Collection<string, WorldData>;
  cooldown: Collection<string, CooldownOptions>;
}

export interface ItemsInfo {
  id: number;
  name: string;
  desc: string;
  recipe?: Recipe;
  func?: ItemInfoFunc;
  chi?: "earth" | "wind" | "fire" | "water";
}

export interface ItemInfoFunc {
  add: string;
  rem: string;
}

export interface Recipe {
  splice: number[];
}

export interface MipMap {
  width: number;
  height: number;
  bufferLength: number;
  count: number;
}

export interface RTPack {
  type: string;
  version: number;
  reserved: number;
  compressedSize: number;
  decompressedSize: number;
  compressionType: number;
  reserved2: Int8Array;
}

export interface RTTXTR {
  type: string;
  version: number;
  reserved: number;
  width: number;
  height: number;
  format: number;
  originalWidth: number;
  originalHeight: number;
  isAlpha: number;
  isCompressed: number;
  reservedFlags: number;
  mipmap: MipMap;
  reserved2: Int32Array;
}

export interface CustomItemsConfig {
  assets: CustomItemsAssets[];
}

export interface CustomItemsAssets {
  name: string;
  type: "rttex";
  id: number;
  path: string;
  overwritePropertiesName: string[];
  item: CustomItemPropsValue;
}

export interface CustomItemPropsValue {
  extraFile: string;
}
