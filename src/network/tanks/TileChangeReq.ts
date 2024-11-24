import { ItemDefinition, Tank, TankPacket, Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { Block } from "../../types";
import { ActionTypes, BlockFlags, LOCKS, ROLE, TankTypes } from "../../Constants";
import { tileParse } from "../../world/tiles/index";
import { getWeatherId } from "../../utils/WeatherIds";
import consola from "consola";

export class TileChangeReq {
  private pos: number;
  private block: Block;
  private itemMeta: ItemDefinition;
  private unbreakableBlocks = [8, 6, 3760, 7372];

  constructor(public base: Base, public peer: Peer, public tank: TankPacket, public world: World) {
    this.pos = (this.tank.data?.xPunch as number) + (this.tank.data?.yPunch as number) * this.world.data.width;
    this.block = this.world.data.blocks[this.pos];
    this.itemMeta = this.base.items.metadata.items[this.block.fg || this.block.bg];
  }

  public async execute() {
    this.tank.data!.netID = this.peer.data?.netID;

    // Fist
    if (this.tank.data?.info === 18) {
      this.onFist();
    } else if (this.tank.data?.info === 32) {
      // const player = new Player(this.base, peer, tank, world);
      // player.onTileWrench();
    }
    // Others
    else {
      this.onPlace();
    }
  }

  private checkOwner() {
    if (this.world.data.owner) {
      if (this.world.data.owner.id !== this.peer.data?.id_user) return false;
      if (this.peer.data?.role !== ROLE.DEVELOPER) return false;

      if (this.itemMeta.id === 242) {
        this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, `\`#[\`0\`9World Locked by ${this.world.data.owner?.displayName}\`#]`));
        return false;
      }

      return true;
    } else return true;
  }

  private async onPlace() {
    const placedItem = this.base.items.metadata.items.find((i) => i.id === this.tank.data?.info);
    const mLock = LOCKS.find((l) => l.id === placedItem?.id);
    const mainLock = this.block.lock ? this.world.data.blocks[(this.block.lock.ownerX as number) + (this.block.lock.ownerY as number) * this.world.data.width] : null;

    if (!placedItem || !placedItem.id) return;
    if (this.tank.data?.info === 18 || this.tank.data?.info === 32) return;

    if (this.world.data.owner) {
      if (!mLock && placedItem.type === ActionTypes.LOCK) {
        this.sendLockSound();
        return;
      }
      if (this.world.data.owner.id !== this.peer.data?.id_user) {
        if (this.peer.data?.role !== ROLE.DEVELOPER) {
          this.sendLockSound();
          return;
        }
      }
    } else {
      if (this.peer.data?.role !== ROLE.DEVELOPER) {
        if (mainLock && mainLock.lock?.ownerUserID !== this.peer.data?.id_user) {
          this.sendLockSound();
          return;
        }
      }
    }

    if (this.unbreakableBlocks.includes(placedItem.id) && this.peer.data?.role !== ROLE.DEVELOPER) {
      this.sendLockSound();
      return;
    }

    const placed = await this.onPlaced(placedItem);

    if (placed) this.peer.modifyItemInventory(this.tank.data?.info as number, -1);
    this.peer.inventory();
    this.peer.saveToCache();
    return;
  }

  private async onPlaced(placedItem: ItemDefinition) {
    const flags = placedItem.flags as number;
    const actionType = placedItem.type as number;
    const isBg = this.base.items.metadata.items[this.tank.data?.info as number].type === ActionTypes.BACKGROUND || this.base.items.metadata.items[this.tank.data?.info as number].type === ActionTypes.SHEET_MUSIC;

    if (this.block.fg === 2946 && actionType !== ActionTypes.DISPLAY_BLOCK) return false;

    if (this.block.fg && flags & BlockFlags.WRENCHABLE) return false;
    if (this.block.fg && !this.block.bg) return false;
    if (this.block.fg && actionType === ActionTypes.PLATFORM) return false;

    const placeBlock = (fruit?: number) => this.world.place(this.peer, this.block.x, this.block.y, placedItem.id as number, isBg, fruit);
    switch (actionType) {
      case ActionTypes.SHEET_MUSIC:
      case ActionTypes.BEDROCK:
      case ActionTypes.LAVA:
      case ActionTypes.PLATFORM:
      case ActionTypes.FOREGROUND:
      case ActionTypes.BACKGROUND: {
        placeBlock();
        this.tileUpdate();
        return true;
      }

      default: {
        consola.debug("Unknown block placing", this.block, placedItem);
        return false;
      }
    }
  }

  private async onFist() {
    if (!this.itemMeta.id) return;
    if (!this.checkOwner()) return this.sendLockSound();

    if (this.unbreakableBlocks.includes(this.itemMeta.id) && this.peer.data?.role !== ROLE.DEVELOPER) {
      this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "It's too strong to break."));
      this.sendLockSound();
      return;
    }

    if ((this.block.damage as number) >= (this.itemMeta.breakHits as number)) {
      this.onFistDestroyed();
    } else {
      this.onFistDamaged();
    }

    this.peer.send(this.tank);
    this.world.saveToCache();
    this.peer.every((p) => {
      if (p.data?.netID !== this.peer.data?.netID && p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
        p.send(this.tank);
      }
    });
  }

  private onFistDestroyed() {
    this.block.damage = 0;
    this.block.resetStateAt = 0;

    if (this.block.fg) this.block.fg = 0;
    else if (this.block.bg) this.block.bg = 0;

    (this.tank.data as Tank).type = TankTypes.TILE_CHANGE_REQUEST;
    (this.tank.data as Tank).info = 18;

    this.block.rotatedLeft = undefined;

    switch (this.itemMeta.type) {
      case ActionTypes.PORTAL:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        this.block.door = undefined;
        break;
      }

      case ActionTypes.SIGN: {
        this.block.sign = undefined;
        break;
      }

      case ActionTypes.DEADLY_BLOCK: {
        this.block.dblockID = undefined;
        break;
      }

      case ActionTypes.HEART_MONITOR: {
        this.block.heartMonitor = undefined;
        break;
      }

      case ActionTypes.SWITCHEROO: {
        this.block.toggleable = undefined;
        break;
      }

      case ActionTypes.WEATHER_MACHINE: {
        this.block.toggleable = undefined;

        this.world.data.weatherId = 41;
        this.peer.every((p) => {
          if (this.peer.data.world === p.data.world && p.data.world !== "EXIT") {
            p.send(Variant.from("OnSetCurrentWeather", this.world.data.weatherId));
          }
        });
        break;
      }

      case ActionTypes.LOCK: {
        if (LOCKS.find((l) => l.id === this.itemMeta.id)) {
          this.world.data.blocks?.forEach((b) => {
            if (b.lock && b.lock.ownerX === this.block.x && b.lock.ownerY === this.block.y) b.lock = undefined;
          });
        } else {
          this.block.worldLock = undefined;
          this.block.lock = undefined;
          this.world.data.owner = undefined;

          this.tileUpdate();
        }
        break;
      }
    }
  }

  private onFistDamaged() {
    (this.tank.data as Tank).type = TankTypes.TILE_APPLY_DAMAGE;
    (this.tank.data as Tank).info = (this.block.damage as number) + 5;

    this.block.resetStateAt = Date.now() + (this.itemMeta.resetStateAfter as number) * 1000;
    if (Number.isNaN(this.block.damage)) this.block.damage = 0;
    // satisfies type
    (this.block.damage as number) += 1;

    switch (this.itemMeta.type) {
      case ActionTypes.SEED: {
        // this.world.harvest(this.peer, block);
        break;
      }

      case ActionTypes.SWITCHEROO: {
        this.tileUpdate();
        if (this.block.toggleable) this.block.toggleable.open = !this.block.toggleable.open;

        break;
      }

      case ActionTypes.WEATHER_MACHINE: {
        let weatherId = getWeatherId(this.itemMeta.id as number);
        if (this.world.data.weatherId === weatherId) weatherId = 41; // to-do add: world.data.baseWeatherId

        this.world.data.weatherId = weatherId;

        this.peer.every((p) => {
          if (this.peer.data.world === p.data.world && p.data.world !== "EXIT") {
            p.send(Variant.from("OnSetCurrentWeather", this.world.data.weatherId));
          }
        });
        this.world.saveToCache();
        break;
      }

      case ActionTypes.DICE: {
        this.block.dice = Math.floor(Math.random() * 6);
        const tankData = this.tank.data as Tank;

        tankData.xPos = this.peer.data.x;
        tankData.yPos = this.peer.data.y;
        tankData.targetNetID = this.peer.data.clothing.hand;
        tankData.state = 16;
        tankData.info = 7;

        const diceTank = this.tank.parse() as Buffer;

        diceTank.writeUint8(this.block.dice, 4 + 3);

        this.tank = TankPacket.fromBuffer(diceTank);
        break;
      }
    }
  }

  private sendLockSound() {
    this.peer.every((p) => {
      if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") p.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
    });
  }

  private async tileUpdate() {
    const data = await tileParse(this.itemMeta.type as number, this.world, this.block);
    this.peer.every((p) => {
      if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
        p.send(
          TankPacket.from({
            type: TankTypes.SEND_TILE_UPDATE_DATA,
            xPunch: this.block.x,
            yPunch: this.block.y,
            data: () => data
          })
        );
      }
    });
  }
}
