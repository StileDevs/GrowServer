import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";
import { ActionTypes, LockPermission } from "../../Constants";
import { ItemDefinition } from "grow-items";
import { Variant } from "growtopia.js";
import { getWeatherId } from "../../utils/Utils";

export class WeatherTile extends Tile {
  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
  }

  public async onPlaceForeground(peer: Peer, itemMeta: ItemDefinition): Promise<boolean> {
    const placed = await super.onPlaceForeground(peer, itemMeta);
    if (!placed) return false;
    this.data.weatherMachine = { cooldownUntil: 0 };
    return true;
  }

  public async onPunch(peer: Peer): Promise<boolean> {
    const itemMeta = this.base.items.metadata.items.get(this.data.fg.toString());
    if (!itemMeta || itemMeta.type !== ActionTypes.WEATHER_MACHINE) {
      return await super.onPunch(peer);
    }

    // Check if player has break permission
    if (!(await this.world.hasTilePermission(peer.data.userID, this.data, LockPermission.BREAK))) {
      return await super.onPunch(peer);
    }

    // Per-tile cooldown
    const now = Date.now();
    const cooldownUntil = this.data.weatherMachine?.cooldownUntil || 0;
    if (now < cooldownUntil) return await super.onPunch(peer);

    const targetWeatherId = getWeatherId(itemMeta.id!);
    if (!targetWeatherId) {
      peer.sendConsoleMessage(`[Weather] Unknown mapping for item ${itemMeta.id}. Keeping weather: ${this.world.data.weather.id}`);
      return await super.onPunch(peer);
    }

    // Toggle: if already active, set to default 41 (clear); else set to mapped id
    const newWeatherId = this.world.data.weather.id === targetWeatherId ? 41 : targetWeatherId;
    this.world.data.weather.id = newWeatherId;

    // Broadcast change to all peers in the world
    this.world.every((p) => {
      p.send(Variant.from("OnSetCurrentWeather", this.world.data.weather.id));
    });

    // Set per-tile cooldown to 2 seconds
    this.data.weatherMachine = this.data.weatherMachine || { cooldownUntil: 0 };
    this.data.weatherMachine.cooldownUntil = now + 2000;

    // Persist
    await this.world.saveToCache();
    await this.world.saveToDatabase();

    // Also apply normal damage/break flow so the machine can be broken
    return await super.onPunch(peer);
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);
    // For now weather machine has no extra serialization; handled later when extra data format is defined
  }

  // Return to inventory when weather machine is broken
  public async onDrop(peer: Peer, destroyedItemID: number): Promise<void> {
    if (destroyedItemID && destroyedItemID > 0) {
      peer.addItemInven(destroyedItemID, 1, false);
      const itemMeta = this.base.items.metadata.items.get(destroyedItemID.toString());
      if (itemMeta?.name) {
        peer.sendConsoleMessage(`You picked up 1 ${itemMeta.name}`);
      }
    }
  }

  // Clear weather when weather machine is broken
  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);
    // clear tile extra to avoid dangling data
    this.data.weatherMachine = undefined;
    if (this.world.data.weather.id !== 41) {
      this.world.data.weather.id = 41;
      this.world.every((p) => {
        p.send(Variant.from("OnSetCurrentWeather", 41));
      });
      await this.world.saveToCache();
      await this.world.saveToDatabase();
    }
  }
}
