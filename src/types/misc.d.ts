import { PeerData } from "./peer";
import { WorldData } from "./world";
import { Collection } from "../utils/Collection.js";
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
