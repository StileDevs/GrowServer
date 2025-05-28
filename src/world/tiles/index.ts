import type { Class } from "type-fest";
import { ActionTypes } from "../../Constants";
import { DoorTile } from "./DoorTile";
import { NormalTile } from "./NormalTile";
import { SignTile } from "./SignTile";
import { Tile } from "../Tile";
import type { World } from "../../core/World";
import type { TileData } from "../../types";
import consola from "consola";
// import { LockTile } from "./LockTile";
import type { Base } from "../../core/Base";
import { ItemDefinition } from "growtopia.js";
// import { HeartMonitorTile } from "./HeartMonitorTile";
// import { DisplayBlockTile } from "./DisplayBlockTile";
import { SwitcheROO } from "./SwitcheROO";
// import { WeatherTile } from "./WeatherTile";
// import { DiceTile } from "./DiceTile";
// import { SeedTile } from "./SeedTile";

const TileMap: Record<number, Class<Tile>> = {
  [ActionTypes.DOOR]:       DoorTile,
  [ActionTypes.MAIN_DOOR]:  DoorTile,
  [ActionTypes.PORTAL]:     DoorTile,
  [ActionTypes.SIGN]:       SignTile,
  // [ActionTypes.LOCK]: LockTile,
  // [ActionTypes.HEART_MONITOR]: HeartMonitorTile,
  // [ActionTypes.DISPLAY_BLOCK]: DisplayBlockTile,
  [ActionTypes.SWITCHEROO]: SwitcheROO,
  // [ActionTypes.WEATHER_MACHINE]: WeatherTile,
  // [ActionTypes.DICE]: DiceTile,
  // [ActionTypes.SEED]: SeedTile
};

// constructs a new Tile subclass based on the ActionType.
// if itemType is not specified, it will get the item type from data.fg.
//  otherwise, it will use the provided itemType. (Only usesd to bootstrap itemType)
const tileFrom = (
  base: Base,
  world: World,
  data: TileData,
  itemType?: ActionTypes
) => {
  const itemMeta = itemType ?? base.items.metadata.items[data.fg].type!;
  try {
    const tile = new TileMap[itemMeta](base, world, data);
    return tile;
  }
  catch (e) {
    return new NormalTile(base, world, data);
  }
}

// const tileParse = async (
//   actionType: number,
//   base: Base,
//   world: World,
//   block: TileData
// ) => {
//   try {
//     let Class = TileMap[actionType];

//     if (!Class) Class = NormalTile;

//     const tile = new Class(base, world, block);
//     await tile.init();
//     const val = await tile.parse();
//     return val;
//   } catch (e) {
//     consola.warn(e);

//     const Class = NormalTile;

//     const tile = new Class(base, world, block);
//     await tile.init();
//     const val = await tile.parse();
//     return val;
//   }
// };

export { TileMap, tileFrom/*, tileParse*/ };
