import { ItemDefinition, Tank, TankPacket, Variant } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { Block } from "../types/world";
import { Role } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { Place } from "./Place";
import { Chance } from "chance";

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
    const tankData = this.tank.data as Tank;
    const pos = (tankData.xPunch as number) + (tankData.yPunch as number) * this.world.data.width;
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
      this.onDestroyed(block, itemMeta, tankData);
    } else {
      this.onDamaged(block, itemMeta, tankData);
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

  private onDamaged(block: Block, itemMeta: ItemDefinition, tankData: Tank) {
    tankData.type = TankTypes.TILE_DAMAGE;
    tankData.info = (block.damage as number) + 5;

    block.resetStateAt = Date.now() + (itemMeta.resetStateAfter as number) * 1000;
    (block.damage as number)++;

    switch (itemMeta.type) {
      case ActionTypes.SEED: {
        this.world.harvest(this.peer, block);
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

  private onDestroyed(block: Block, itemMeta: ItemDefinition, tankData: Tank) {
    block.damage = 0;
    block.resetStateAt = 0;

    if (block.fg) block.fg = 0;
    else if (block.bg) block.bg = 0;

    tankData.type = TankTypes.TILE_PUNCH;
    tankData.info = 18;

    block.rotatedLeft = undefined;

    const rarity = itemMeta.rarity as number;
    if (rarity <= 998) {
      console.log("added exp");
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
    }
  }
}

/** Handle Punch */
