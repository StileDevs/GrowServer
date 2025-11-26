import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "@growserver/types";
import { ExtendBuffer } from "@growserver/utils";
import { Tile } from "../Tile";
import { ActionTypes, LockPermission, TileExtraTypes } from "@growserver/const";
import { ItemDefinition } from "grow-items";
import { Variant } from "growtopia.js";

export class WeatherTile extends Tile {
  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
  }

  public async onPunch(peer: Peer): Promise<boolean> {
    // Check if player has break permission
    if (
      !(await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BREAK,
      ))
    ) {
      return super.onPunch(peer);
    }

    const itemMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    );

    // if the block still has any damage, do not toggle.
    if (this.data.resetStateAt && this.data.resetStateAt > Date.now())
      return super.onPunch(peer);

    // they used this as the weather id. Lol
    const targetWeatherId = itemMeta?.audioVolume;
    if (!targetWeatherId) {
      peer.sendConsoleMessage(
        `[Weather] Unknown mapping for item ${this.data.fg}. Keeping weather: ${this.world.data.weather.id}`,
      );
      return await super.onPunch(peer);
    }

    // Toggle: if already active, set to default 41 (clear); else set to mapped id
    const newWeatherId =
      this.world.data.weather.id === targetWeatherId ? 41 : targetWeatherId;
    this.world.data.weather.id = newWeatherId;

    // Broadcast change to all peers in the world
    this.world.every((p) => {
      p.send(Variant.from("OnSetCurrentWeather", this.world.data.weather.id));
    });

    // Also apply normal damage/break flow so the machine can be broken
    return await super.onPunch(peer);
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);
    // there were no exta data here lol. Srry
  }

  // Clear weather when weather machine is broken
  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);
    // this is the old default backgound with no ads and things.
    if (this.world.data.weather.id !== 41) {
      this.world.data.weather.id = 41;
      this.world.every((p) => {
        p.send(Variant.from("OnSetCurrentWeather", 41));
      });
    }
  }
}
