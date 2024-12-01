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
