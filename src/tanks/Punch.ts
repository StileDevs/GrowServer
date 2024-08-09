import { type ItemDefinition, type Tank, TankPacket, Variant } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import { World } from "../structures/World.js";
import type { Block } from "../types";
import { Role } from "../utils/Constants.js";
import { TankTypes } from "../utils/enums/TankTypes.js";
import { ActionTypes } from "../utils/enums/Tiles.js";
import { Place } from "./Place.js";
import { Chance } from "chance";
import { getWeatherId } from "../utils/builders/WeatherBuilder.js";

export class Punch {
  public base: BaseServer;
  public peer: Peer;
  public tank: TankPacket;
  public world: World;

  constructor(base: BaseServer, peer: Peer, tank: TankPacket, world: World) {
    this.base = base;
    this.peer = peer;
    this.tank = tank;
    this.world = world;
  }

  public onPunch() {
    const pos = (this.tank.data?.xPunch as number) + (this.tank.data?.yPunch as number) * this.world.data.width;
    const block = this.world.data.blocks[pos];
    const itemMeta = this.base.items.metadata.items[block.fg || block.bg];

    if (!itemMeta.id) return;
    if (typeof block.damage !== "number" || (block.resetStateAt as number) <= Date.now()) block.damage = 0;

    if (this.world.data.owner) {
      if (this.world.data.owner.id !== this.peer.data?.id_user) {
        if (this.peer.data?.role !== Role.DEVELOPER) {
          if (itemMeta.id === 242) this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, `\`#[\`0\`9World Locked by ${this.world.data.owner?.displayName}\`#]`));

          this.peer.everyPeer((p) => {
            if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") p.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
          });
          return;
        }
      }
    }

    if (itemMeta.id === 8 || itemMeta.id === 6 || itemMeta.id === 3760 || itemMeta.id === 7372) {
      if (this.peer.data?.role !== Role.DEVELOPER) {
        this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "It's too strong to break."));
        this.peer.everyPeer((p) => {
          if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") p.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
        });
        return;
      }
    }

    if (block.damage >= (itemMeta.breakHits as number)) {
      this.onDestroyed(block, itemMeta);
    } else {
      this.onDamaged(block, itemMeta);
    }

    this.peer.send(this.tank);

    this.world.saveToCache();

    this.peer.everyPeer((p) => {
      if (p.data?.netID !== this.peer.data?.netID && p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
        p.send(this.tank);
      }
    });
    return;
  }

  private onDamaged(block: Block, itemMeta: ItemDefinition) {
    (this.tank.data as Tank).type = TankTypes.TILE_APPLY_DAMAGE;
    (this.tank.data as Tank).info = (block.damage as number) + 5;

    block.resetStateAt = Date.now() + (itemMeta.resetStateAfter as number) * 1000;
    (block.damage as number)++;

    switch (itemMeta.type) {
      case ActionTypes.SEED: {
        this.world.harvest(this.peer, block);
        break;
      }

      case ActionTypes.SWITCHEROO: {
        Place.tileUpdate(this.base, this.peer, itemMeta?.type || 0, block, this.world);
        if (block.toggleable) block.toggleable.open = !block.toggleable.open;

        break;
      }

      case ActionTypes.WEATHER_MACHINE: {
        // block.weather!.enabled = !block.weather!.enabled;

        let weatherId = getWeatherId(itemMeta.id as number);
        if (this.world.data.weatherId === weatherId) weatherId = 41; // to-do add: world.data.baseWeatherId

        this.world.data.weatherId = weatherId;

        this.peer.everyPeer((p) => {
          if (this.peer.data.world === p.data.world && p.data.world !== "EXIT") {
            p.send(Variant.from("OnSetCurrentWeather", this.world.data.weatherId));
          }
        });
        this.world.saveToCache();
        break;
      }

      case ActionTypes.DICE: {
        block.dice = Math.floor(Math.random() * 6);
        const tankData = this.tank.data as Tank;

        tankData.xPos = this.peer.data.x;
        tankData.yPos = this.peer.data.y;
        tankData.targetNetID = this.peer.data.clothing.hand;
        tankData.state = 16;
        tankData.info = 7;

        const diceTank = this.tank.parse() as Buffer;

        diceTank.writeUint8(block.dice, 4 + 3);

        this.tank = TankPacket.fromBuffer(diceTank);
        break;
      }

      case ActionTypes.PROVIDER: {
        // Make a if statement that check if the block ready to punch (passed time must be in seconds format)
        // for example chicken is 24 hour, then its should be 86400 seconds
        const date = block.provider?.date || 0;
        const timePassed = Math.floor((Date.now() - date) / 1000);

        // Reset date
        block.provider = {
          date: Date.now()
        };

        // Update block visual
        Place.tileVisualUpdate(this.peer, block, 0x0, true);
        break;
      }
    }
  }

  public splitGems(num: number) {
    const gemValues = {
      yellow: 1,
      blue: 5,
      red: 10,
      green: 50,
      purple: 100
    };

    const values = [];

    for (const [gemName, gemValue] of Object.entries(gemValues).sort((a, b) => b[1] - a[1])) {
      const maxGems = Math.floor(num / gemValue);
      values.push(...Array(maxGems).fill(gemValue));
      num -= maxGems * gemValue;
      if (num === 0) {
        break;
      }
    }

    return values;
  }

  public dropRandomGems(min: number, max: number, block: Block) {
    const randGems = Math.floor(Math.random() * (max - min + 1)) + min;
    const arrGems = this.splitGems(randGems);

    arrGems.forEach((v) => {
      const extra = Math.random() * 6;

      const x = (block.x as number) * 32 + extra;
      const y = (block.y as number) * 32 + extra - Math.floor(Math.random() * (3 - -1) + -3);
      this.world.drop(this.peer, x, y, 112, v, { tree: true, noSimilar: true });
    });
  }

  private onDestroyed(block: Block, itemMeta: ItemDefinition) {
    block.damage = 0;
    block.resetStateAt = 0;

    if (block.fg) block.fg = 0;
    else if (block.bg) block.bg = 0;

    (this.tank.data as Tank).type = TankTypes.TILE_CHANGE_REQUEST;
    (this.tank.data as Tank).info = 18;

    block.rotatedLeft = undefined;

    const rarity = itemMeta.rarity as number;
    if (rarity <= 998) {
      this.peer.addExp(rarity / 5 > 0 ? rarity / 5 : 1);
    }

    const wiki = this.base.items.wiki.find((v) => v.id === itemMeta.id);
    if (wiki?.gemsDrop && typeof wiki.gemsDrop === "string") {
      if (wiki.gemsDrop === "N/A") {
        // nothing
      } else {
        const [min, max] = wiki.gemsDrop.split("-").map((v) => parseInt(v));
        const chance = new Chance();

        if (max <= 1 || rarity >= 1) {
          if (chance.bool({ likelihood: 50 })) this.dropRandomGems(min, max, block);
        } else if (max <= 5 || rarity >= 10) {
          if (chance.bool({ likelihood: 90 })) this.dropRandomGems(min, max, block);
        }
      }
    }

    switch (itemMeta.type) {
      case ActionTypes.PORTAL:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        block.door = undefined;
        break;
      }

      case ActionTypes.SIGN: {
        block.sign = undefined;
        break;
      }

      case ActionTypes.DEADLY_BLOCK: {
        block.dblockID = undefined;
        break;
      }

      case ActionTypes.HEART_MONITOR: {
        block.heartMonitor = undefined;
        break;
      }

      case ActionTypes.SWITCHEROO: {
        block.toggleable = undefined;
        break;
      }

      case ActionTypes.WEATHER_MACHINE: {
        block.toggleable = undefined;

        this.world.data.weatherId = 41;
        this.peer.everyPeer((p) => {
          if (this.peer.data.world === p.data.world && p.data.world !== "EXIT") {
            p.send(Variant.from("OnSetCurrentWeather", this.world.data.weatherId));
          }
        });
        break;
      }

      case ActionTypes.LOCK: {
        if (this.base.locks.find((l) => l.id === itemMeta.id)) {
          this.world.data.blocks?.forEach((b) => {
            if (b.lock && b.lock.ownerX === block.x && b.lock.ownerY === block.y) b.lock = undefined;
          });
        } else {
          block.worldLock = undefined;
          block.lock = undefined;
          this.world.data.owner = undefined;

          // tileUpdate(base, peer, itemMeta.type, block, world);
          Place.tileVisualUpdate(this.peer, block, 0x0, true);
        }
        break;
      }

      case ActionTypes.PROVIDER: {
        block.provider = undefined;
        break;
      }
    }
  }
}

/** Handle Punch */
