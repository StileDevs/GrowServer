import { PeerData } from "./peer";
import { WorldData } from "./world";
import { Collection } from "../utils/Collection";
import { CooldownOptions } from "./commands";
import { ItemsDatMeta } from "growtopia.js";
import { ItemsInfo } from "./item-pages";

export interface CDNContent {
  version: string;
  uri: string;
  itemsDatName: string;
}

export interface ItemsData {
  hash:     string,
  content:  Buffer,
  metadata:  ItemsDatMeta,
  wiki:     ItemsInfo[]
}


export interface Cache {
  peers: Collection<number, PeerData>;
  worlds: Collection<string, WorldData>;
  cooldown: Collection<string, CooldownOptions>;
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
  id: number;
  item: CustomItemsProps;
  storePath: string;
}

export interface CustomItemsProps {
  extraFile?: CustomItemsExtraFile;
  texture?: CustomItemsTexture;

  flags?: number;
  flagsCategory?: number;
  type?: number;
  materialType?: number;
  name?: string;
  visualEffectType?: number;
  flags2?: number;
  textureX?: number;
  textureY?: number;
  storageType?: number;
  isStripeyWallpaper?: number;
  collisionType?: number;
  breakHits?: number;
  resetStateAfter?: number;
  bodyPartType?: number;
  blockType?: number;
  growTime?: number;
  rarity?: number;
  maxAmount?: number;
  audioVolume?: number;
  petName?: string;
  petPrefix?: string;
  petSuffix?: string;
  petAbility?: string;
  seedBase?: number;
  seedOverlay?: number;
  treeBase?: number;
  treeLeaves?: number;
  seedColor?: number;
  seedOverlayColor?: number;
  isMultiFace?: number;
  isRayman?: number;
  extraOptions?: string;
  texture2?: string;
  extraOptions2?: string;
  punchOptions?: string;

  extraBytes?: Buffer;

  // new options
  ingredient?: number;
  flags3?: number;
  flags4?: number;
  bodyPart?: Buffer;
  flags5?: number;
  extraTexture?: string;
  itemRenderer?: string;
  unknownInt1?: number; // NOTE: not sure what this does
  unknownBytes1?: Buffer; // NOTE: not sure what this does
  extraFlags1?: number; // NOTE: not sure what this does
  extraHash1?: number; // NOTE: not sure what this does
  unknownBytes2?: Buffer; // NOTE: not sure what this does
}

export interface CustomItemsExtraFile {
  fileName: string;
  pathAsset: string;
  pathResult: string;
}

export interface CustomItemsTexture {
  fileName: string;
  pathAsset: string;
  pathResult: string;
}
