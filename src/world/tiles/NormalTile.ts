import { ItemDefinition } from "growtopia.js";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { TileData } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";

export class NormalTile extends Tile {
  constructor(
    public base: Base,
    public world: World,
    public block: TileData
  ) {
    super(base, world, block);
  }
}
