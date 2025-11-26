import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { TileData } from "@growserver/types";
import { ExtendBuffer } from "@growserver/utils";
import { Tile } from "../Tile";

export class NormalTile extends Tile {
  constructor(
    public base: Base,
    public world: World,
    public block: TileData,
  ) {
    super(base, world, block);
  }
}
