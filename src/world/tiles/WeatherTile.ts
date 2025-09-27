import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";
import { ActionTypes, LockPermission, TileExtraTypes } from "../../Constants";
import { Variant } from "growtopia.js";
import { getWeatherId } from "../../utils/Utils";

const weatherToggleCooldown = new Map<string, number>();

export class WeatherTile extends Tile {
  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
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

    // Calculate target weather
    const key = `${this.world.worldName}:${this.data.x},${this.data.y}`;
    const now = Date.now();
    const until = weatherToggleCooldown.get(key) || 0;

    // toggle cooldown
    if (now < until) {
      return await super.onPunch(peer);
    }

    const targetWeatherId = getWeatherId(itemMeta.id!);
    if (!targetWeatherId) {
      peer.sendConsoleMessage(`[Weather] Unknown mapping for item ${itemMeta.id}. Keeping weather: ${this.world.data.weatherId}`);
      return await super.onPunch(peer);
    }

    // Toggle: if already active, set to default 41 (clear); else set to mapped id
    const newWeatherId = this.world.data.weatherId === targetWeatherId ? 41 : targetWeatherId;
    this.world.data.weatherId = newWeatherId;

    // Broadcast change to all peers in the world
    this.world.every((p) => {
      p.send(Variant.from("OnSetCurrentWeather", this.world.data.weatherId));
    });

    // Persist world state (cache and database)
    await this.world.saveToCache();
    await this.world.saveToDatabase();

    // Set cooldown to 2 seconds to allow break without re-toggling
    weatherToggleCooldown.set(key, now + 2000);

    // Also apply normal damage/break flow so the machine can be broken
    return await super.onPunch(peer);
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);
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
    if (this.world.data.weatherId !== 41) {
      this.world.data.weatherId = 41;
      this.world.every((p) => {
        p.send(Variant.from("OnSetCurrentWeather", 41));
      });
      await this.world.saveToCache();
      await this.world.saveToDatabase();
    }
  }
}
