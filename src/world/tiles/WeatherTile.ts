import { ItemDefinition } from "growtopia.js";
import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";
import { TileExtraTypes } from "../../Constants";

export class WeatherTile extends Tile {
  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
  }
  // TODO: Implement weather related data.
}
