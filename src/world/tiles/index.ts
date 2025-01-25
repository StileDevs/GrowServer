import type { Class } from "type-fest";
import { ActionTypes } from "../../Constants";
import { DoorTile } from "./DoorTile";
import { NormalTile } from "./NormalTile";
import { SignTile } from "./SignTile";
import { Tile } from "../Tile";
import type { World } from "../../core/World";
import type { Block } from "../../types";
import consola from "consola";
import { LockTile } from "./LockTile";
import type { Base } from "../../core/Base";
import { HeartMonitorTile } from "./HeartMonitorTile";
import { DisplayBlockTile } from "./DisplayBlockTile";
import { SwitcheROO } from "./SwitcheROO";
import { WeatherTile } from "./WeatherTile";
import { DiceTile } from "./DiceTile";
import { SeedTile } from "./SeedTile";

const TileMap: Record<number, Class<Tile>> = {
  [ActionTypes.DOOR]:            DoorTile,
  [ActionTypes.MAIN_DOOR]:       DoorTile,
  [ActionTypes.PORTAL]:          DoorTile,
  [ActionTypes.SIGN]:            SignTile,
  [ActionTypes.LOCK]:            LockTile,
  [ActionTypes.HEART_MONITOR]:   HeartMonitorTile,
  [ActionTypes.DISPLAY_BLOCK]:   DisplayBlockTile,
  [ActionTypes.SWITCHEROO]:      SwitcheROO,
  [ActionTypes.WEATHER_MACHINE]: WeatherTile,
  [ActionTypes.DICE]:            DiceTile,
  [ActionTypes.SEED]:            SeedTile
};

const tileParse = async (
  actionType: number,
  base: Base,
  world: World,
  block: Block
) => {
  try {
    let Class = TileMap[actionType];

    if (!Class) Class = NormalTile;

    const tile = new Class(base, world, block);
    await tile.init();
    const val = await tile.parse();
    return val;
  } catch (e) {
    consola.warn(e);

    const Class = NormalTile;

    const tile = new Class(base, world, block);
    await tile.init();
    const val = await tile.parse();
    return val;
  }
};

export { TileMap, tileParse };
