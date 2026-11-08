import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { logger } from "../../../utils/logger";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import { LockPermission, TileFlags, WEATHER_CLEAR } from "../constants";
import { getDefaultExtra } from "./default-extra-tile";

/**
 * Weather id per weather machine item id (carried over from the legacy
 * `getWeatherId` helper). Machines missing here fall back to the item's
 * `audioVolume` field, which items.dat uses for the weather id.
 */
const WEATHER_MACHINE_IDS: Partial<Record<number, number>> = {
  934: 2, // Weather Machine - Sunny
  946: 3, // Weather Machine - Night
  932: 4, // Weather Machine - Arid
  984: 5, // Weather Machine - Rainy City
  1210: 8, // Weather Machine - Heatwave
  1364: 11, // Weather Machine - Warp Speed
  1490: 10, // Weather Machine - Undersea
  1750: 15, // Weather Machine - Nothingness
  2046: 17, // Weather Machine - Jungle
  2284: 18, // Weather Machine - Balloon Warz
  2744: 19, // Weather Machine - Comet
  3252: 20, // Weather Machine - Pagoda
  3446: 21, // Weather Machine - Apocalypse
  3534: 22, // Weather Machine - Mars
  3694: 28, // Weather Machine - Spooky
  3832: 29, // Weather Machine - Snowy
  4242: 30, // Weather Machine - Howling Sky
  4486: 31, // Weather Machine - Bountiful
  4776: 32, // Weather Machine - Meteor Shower
  4892: 33, // Weather Machine - Stuff
  5000: 34, // Weather Machine - Background
  5112: 35, // Weather Machine - Digital Rain
  5654: 36, // Weather Machine - Monochrome
  5716: 37, // Weather Machine - Surgery
  5958: 38, // Weather Machine - Party
  6854: 42, // Weather Machine - Pineapples
  7644: 44, // Weather Machine - Frozen Cliffs
  8836: 48, // Weather Machine - Mt. Growmore
  8896: 47, // Weather Machine - Black Hole
  10286: 51, // Weather Machine - St. Paddy's
  11880: 59, // Weather Machine - Bubble Bath
  12054: 60, // Weather Machine - Sunny Reef
  12056: 61, // Weather Machine - Night Reef
  12408: 62, // Weather Machine - Cyber City
  12844: 64, // Weather Machine - Royal Winter
  13004: 65, // Weather Machine - Royal Spring
  13070: 66, // Weather Machine - Sakura
};

/**
 * Weather id a weather machine item switches the world to, 0 when unknown.
 */
export function getWeatherId(itemId: number): number {
  return WEATHER_MACHINE_IDS[itemId] ?? getItem(itemId)?.audioVolume ?? 0;
}

/**
 * Weather machines. Punching one with break access toggles the world weather
 * between the machine's weather and the clear sky; breaking it clears the
 * weather. Most machines have no extra data; the few that do (Weather
 * Machine - Background) use the default payload of their extra type.
 */
export class WeatherTile extends Tile {
  public override async onPunch(player: Player): Promise<boolean> {
    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BREAK))) {
      return super.onPunch(player);
    }

    // a machine that is still damaged is being broken: don't flip the weather on every hit
    if (this.data.resetStateAt && this.data.resetStateAt > Date.now()) {
      return super.onPunch(player);
    }

    const weatherId = getWeatherId(this.data.fg);
    if (!weatherId) {
      logger.debug({ itemId: this.data.fg, world: this.world.name }, "no weather id known for weather machine");
      player.variants.sendOnConsoleMessage(`\`4Unknown weather machine\`\` (item ${this.data.fg}), keeping the current weather.`);
      return super.onPunch(player);
    }

    this.setWeather(this.world.data.weather.id === weatherId ? WEATHER_CLEAR : weatherId);
    return super.onPunch(player);
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    if (this.world.data.weather.id !== WEATHER_CLEAR) this.setWeather(WEATHER_CLEAR);
  }

  public override serializedFlags(flags: number): number {
    return this.defaultExtra() ? flags | TileFlags.TILEEXTRA : flags;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const extra = this.defaultExtra();
    if (extra) buffer.writeBytes(extra);
  }

  /** Sets the world weather and tells everyone in the world. */
  private setWeather(weatherId: number): void {
    this.world.data.weather.id = weatherId;
    for (const other of this.world.players) {
      other.variants.sendOnSetCurrentWeather(weatherId);
    }
  }

  private defaultExtra(): number[] | undefined {
    return getDefaultExtra(this.item?.type ?? -1, this.data.fg);
  }
}
