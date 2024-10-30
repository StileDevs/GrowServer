import type { Class } from "type-fest";
import { ActionTypes } from "../../Constants.js";
import { DoorTile } from "./DoorTile.js";
import { NormalTile } from "./NormalTile.js";
import { SignTile } from "./SignTile.js";
import { Tile } from "../Tile.js";
import { Peer } from "../../core/Peer.js";
import { World } from "../../core/World.js";
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

    // if (actionType === 13) console.log(Class);
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
