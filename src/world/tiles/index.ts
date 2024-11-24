import type { Class } from "type-fest";
import { ActionTypes } from "../../Constants";
import { DoorTile } from "./DoorTile";
import { NormalTile } from "./NormalTile";
import { SignTile } from "./SignTile";
import { Tile } from "../Tile";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { Block } from "../../types";
import consola from "consola";

const TileMap: Record<number, Class<Tile>> = {
  [ActionTypes.DOOR]: DoorTile,
  [ActionTypes.MAIN_DOOR]: DoorTile,
  [ActionTypes.PORTAL]: DoorTile,
  [ActionTypes.SIGN]: SignTile
};

const tileParse = async (actionType: number, world: World, block: Block) => {
  try {
    let Class = TileMap[actionType];

    if (!Class) Class = NormalTile;

    const tile = new Class(world, block);
    await tile.init();
    const val = await tile.parse();
    return val;
  } catch (e) {
    consola.warn(e);

    const Class = NormalTile;

    const tile = new Class(world, block);
    await tile.init();
    const val = await tile.parse();
    return val;
  }
};

export { TileMap, tileParse };
