import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { logger } from "../../../utils/logger";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import type { World } from "../world";
import type { TileData, WeatherSettings } from "../types";
import { ActionTypes, ITEM_ID, LockPermission, TileExtraTypes, TileFlags, WEATHER_CLEAR } from "../constants";
import { getDefaultExtra } from "./default-extra-tile";

/**
 * Weather id a weather machine item switches the world to. items.dat stores
 * it in the item's `audioVolume` field (sunny 4, night 2, arid 3, ...), which
 * is why the hardcoded table that used to live here was off by one machine.
 */
export function getWeatherId(itemId: number): number {
  return getItem(itemId)?.audioVolume ?? 0;
}

/** Default settings of the machines that have a dialog. */
const DEFAULT_SETTINGS: Partial<Record<number, WeatherSettings>> = {
  [ITEM_ID.WEATHER_BACKGROUND]: { itemId: ITEM_ID.CAVE_BACKGROUND },
  [ITEM_ID.WEATHER_STUFF]: { itemId: ITEM_ID.DIRT, gravity: 50, spin: false, invert: false },
  [ITEM_ID.WEATHER_HEATWAVE]: { red: 255, green: 128, blue: 0 },
};

/** Stuff: the furthest the fall speed may be set from 0. */
const MAX_STUFF_GRAVITY = 500;
/** Heatwave: at least one color channel must reach this, or the sky goes black. */
const MIN_HEATWAVE_CHANNEL = 40;

/** Action types whose tiles are weather machines. */
export const WEATHER_ACTION_TYPES: ReadonlySet<number> = new Set([ActionTypes.WEATHER_MACHINE, ActionTypes.WEATHER_SPECIAL, ActionTypes.WEATHER_SPECIAL2]);

/**
 * Weather machines. Punching one with break access toggles the world weather
 * between the machine's weather and the clear sky; breaking it clears the
 * weather. The active machine carries the OPEN flag. Background, Stuff and
 * Heatwave have settings (wrench) that travel in the tile's extra data.
 */
export class WeatherTile extends Tile {
  /** Settings of this machine, created from the defaults on demand. */
  public get settings(): WeatherSettings {
    if (!this.data.weatherSettings) this.data.weatherSettings = { ...(DEFAULT_SETTINGS[this.data.fg] ?? {}) };
    return this.data.weatherSettings;
  }

  /** Whether this machine has a settings dialog. */
  public get hasSettings(): boolean {
    return DEFAULT_SETTINGS[this.data.fg] !== undefined;
  }

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

    const turnOn = !(this.data.flags & TileFlags.OPEN) || this.world.data.weather.id !== weatherId;
    this.activate(turnOn);
    return super.onPunch(player);
  }

  public override async onDestroy(player: Player): Promise<void> {
    const wasActive = (this.data.flags & TileFlags.OPEN) !== 0;
    await super.onDestroy(player);
    delete this.data.weatherSettings;
    if (wasActive || this.world.data.weather.id !== WEATHER_CLEAR) this.setWeather(WEATHER_CLEAR);
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!this.hasSettings) return false;
    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPlaceFail(player);
      return false;
    }

    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;
    const settings = this.settings;

    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon(`\`w${itemMeta.name}\`\``, itemMeta.id ?? 0, "big")
      .addSpacer("small")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y);

    switch (this.data.fg) {
      case ITEM_ID.WEATHER_HEATWAVE:
        dialog
          .addTextBox("Adjust the color of your heat wave here, by including 0-255 of Red, Green, and Blue.")
          .addInputBox("red", "Red", settings.red ?? 0, 3)
          .addInputBox("green", "Green", settings.green ?? 0, 3)
          .addInputBox("blue", "Blue", settings.blue ?? 0, 3);
        break;
      case ITEM_ID.WEATHER_BACKGROUND:
        dialog
          .addTextBox("You can scan any Background Block to set it up in your weather machine.")
          .addItemPicker("choose", `Item: \`2${getItem(settings.itemId ?? 0)?.name ?? "None"}\`\``, "Select any Background Block");
        break;
      case ITEM_ID.WEATHER_STUFF:
        dialog
          .addItemPicker("choose", `Item: \`2${getItem(settings.itemId ?? 0)?.name ?? "None"}\`\``, "Select any item to rain down")
          .addInputBox("gravity", "Gravity:", settings.gravity ?? 0, 5)
          .addCheckbox("spin", "Spin Items", settings.spin ? "selected" : "not_selected")
          .addCheckbox("invert", "Invert Sky Colors", settings.invert ? "selected" : "not_selected");
        break;
    }

    player.variants.sendOnDialogRequest(dialog.endDialog("weatherspcl", "Cancel", "Okay").str());
    return true;
  }

  public override serializedFlags(flags: number): number {
    return this.extra() ? flags | TileFlags.TILEEXTRA : flags;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const extra = this.extra();
    if (extra) buffer.writeBytes(extra);
  }

  /**
   * Switches this machine on (and every other machine off) or off, and
   * applies the matching world weather.
   */
  public activate(on: boolean): void {
    for (const tile of this.world.data.blocks) {
      if (tile !== this.data && tile.flags & TileFlags.OPEN && WEATHER_ACTION_TYPES.has(getItem(tile.fg)?.type ?? -1)) {
        tile.flags &= ~TileFlags.OPEN;
        new WeatherTile(this.world, tile).tileUpdate();
      }
    }

    if (on) this.data.flags |= TileFlags.OPEN;
    else this.data.flags &= ~TileFlags.OPEN;
    this.tileUpdate();
    this.setWeather(on ? getWeatherId(this.data.fg) : WEATHER_CLEAR);
  }

  /** Sets the world weather and tells everyone in the world. */
  public setWeather(weatherId: number): void {
    this.world.data.weather.id = weatherId;
    for (const other of this.world.players) {
      other.variants.sendOnSetCurrentWeather(weatherId);
    }
    this.world.markDirty();
  }

  /** The extra payload: the machine's settings, or its type's default. */
  private extra(): number[] | undefined {
    const settings = this.hasSettings ? this.settings : undefined;
    switch (this.data.fg) {
      case ITEM_ID.WEATHER_BACKGROUND:
        return [TileExtraTypes.WEATHER_SPECIAL, ...u32(settings?.itemId ?? ITEM_ID.CAVE_BACKGROUND)];
      case ITEM_ID.WEATHER_HEATWAVE: {
        const rgb = ((settings?.red ?? 0) << 8) | ((settings?.green ?? 0) << 16) | ((settings?.blue ?? 0) << 24);
        return [TileExtraTypes.WEATHER_SPECIAL, ...u32(rgb >>> 0)];
      }
      case ITEM_ID.WEATHER_STUFF: {
        const flags = (settings?.spin ? 1 : 0) | (settings?.invert ? 2 : 0);
        return [TileExtraTypes.WEATHER_SPECIAL2, ...u32(settings?.itemId ?? ITEM_ID.DIRT), ...u32((settings?.gravity ?? 0) >>> 0), flags];
      }
      default:
        return getDefaultExtra(this.item?.type ?? -1, this.data.fg);
    }
  }
}

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function parseNumber(raw: string): number | undefined {
  const text = raw.trim();
  return /^-?\d+$/.test(text) ? Number.parseInt(text, 10) : undefined;
}

/**
 * dialog_name "weatherspcl": settings of Heatwave, Background and Stuff.
 */
registerDialog("weatherspcl", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  const tile = new WeatherTile(world, block);
  if (!tile.hasSettings) return;
  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) return;

  const settings = tile.settings;
  if (!applySettings(player, block, settings, action)) return;

  tile.tileUpdate();
  world.markDirty();
  // the client reads the settings from the active machine, so refresh the sky
  if (block.flags & TileFlags.OPEN) tile.setWeather(world.data.weather.id);
});

function applySettings(player: Player, block: TileData, settings: WeatherSettings, action: Parameters<Parameters<typeof registerDialog>[1]>[1]): boolean {
  switch (block.fg) {
    case ITEM_ID.WEATHER_HEATWAVE: {
      const red = parseNumber(action.get("red"));
      const green = parseNumber(action.get("green"));
      const blue = parseNumber(action.get("blue"));
      if (red === undefined || green === undefined || blue === undefined) return false;
      if ([red, green, blue].some((channel) => channel < 0 || channel > 255)) return false;
      if (red < MIN_HEATWAVE_CHANNEL && green < MIN_HEATWAVE_CHANNEL && blue < MIN_HEATWAVE_CHANNEL) {
        player.sendTextBubble("You can't make a heatwave that dark (one of the colors must be 40+)!", false);
        return false;
      }
      settings.red = red;
      settings.green = green;
      settings.blue = blue;
      return true;
    }
    case ITEM_ID.WEATHER_BACKGROUND: {
      if (!action.contains("choose")) return false;
      const itemId = action.getInt("choose", 0, 0);
      if (getItem(itemId)?.type !== ActionTypes.BACKGROUND) {
        player.sendTextBubble("That's not a background!", false);
        return false;
      }
      settings.itemId = itemId;
      return true;
    }
    case ITEM_ID.WEATHER_STUFF: {
      if (action.contains("choose")) {
        const itemId = action.getInt("choose", 0, 0);
        if (getItem(itemId)) settings.itemId = itemId;
      }
      const gravity = parseNumber(action.get("gravity"));
      if (gravity !== undefined) settings.gravity = Math.max(-MAX_STUFF_GRAVITY, Math.min(MAX_STUFF_GRAVITY, gravity));
      settings.spin = action.get("spin") === "1";
      settings.invert = action.get("invert") === "1";
      return true;
    }
    default:
      return false;
  }
}
