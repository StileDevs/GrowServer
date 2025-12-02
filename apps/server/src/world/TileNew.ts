import { TileData } from "@growserver/types";
import { Peer } from "growtopia.js";
import { Base } from "../core/Base";
import { World } from "../core/WorldNew";

export class Tile {
  constructor(
    public base: Base,
    public world: World,
    public peer: Peer,
    public data: TileData,
  ) {}
}