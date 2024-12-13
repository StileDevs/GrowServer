import { type ItemDefinition, type Tank, TankPacket, Variant } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import { World } from "../structures/World.js";
import { Role } from "../utils/Constants.js";
import { TankTypes } from "../utils/enums/TankTypes.js";
import { ActionTypes } from "../utils/enums/Tiles.js";
import type { PlacedArg, Block } from "../types";
import { Floodfill } from "../structures/FloodFill.js";
import { BlockFlags } from "../utils/enums/ItemTypes.js";
import { Tile } from "../structures/Tile.js";

export class Place {
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

  public static tileUpdate(base: BaseServer, peer: Peer, actionType: number, block: Block, world: World) {
    peer.everyPeer((p) => {
      if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
        p.send(
          TankPacket.from({
            type: TankTypes.SEND_TILE_UPDATE_DATA,
            xPunch: block.x,
            yPunch: block.y,
            data: () => new Tile(base, world, block).serialize(actionType)
          })
        );
      }
    });
  }

  public tileUpdate(actionType: number, block: Block) {
    this.peer.everyPeer((p) => {
      if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
        p.send(
          TankPacket.from({
            type: TankTypes.SEND_TILE_UPDATE_DATA,
            xPunch: block.x,
            yPunch: block.y,
            data: () => new Tile(this.base, this.world, block).serialize(actionType)
          })
        );
      }
    });
  }

  public static tileVisualUpdate(peer: Peer, block: Block, visualFlags: number, everyPeer = false) {
    const tank = TankPacket.from({
      type: TankTypes.SEND_TILE_UPDATE_DATA,
      xPunch: block.x,
      yPunch: block.y,
      data: () => {
        const buf = Buffer.alloc(8);

        buf.writeUInt32LE(block.fg | (block.bg << 16));
        buf.writeUint16LE(0x0, 4);
        buf.writeUint16LE(visualFlags, 6);

        return buf;
      }
    });

    if (everyPeer) {
      peer.everyPeer((p) => {
        if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
          p.send(tank);
        }
      });
    } else {
      peer.send(tank);
    }
  }

  public tileVisualUpdate(block: Block, visualFlags: number, everyPeer = false) {
    const tank = TankPacket.from({
      type: TankTypes.SEND_TILE_UPDATE_DATA,
      xPunch: block.x,
      yPunch: block.y,
      data: () => {
        const buf = Buffer.alloc(8);

        buf.writeUInt32LE(block.fg | (block.bg << 16));
        buf.writeUint16LE(0x0, 4);
        buf.writeUint16LE(visualFlags, 6);

        return buf;
      }
    });

    if (everyPeer) {
      this.peer.everyPeer((p) => {
        if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT") {
          p.send(tank);
        }
      });
    } else {
      this.peer.send(tank);
    }
  }

  public onConsumable(placedItem: ItemDefinition, block: Block) {
    switch (placedItem.id) {
      case 1404: {
        if (this.world.data.owner) {
          if (this.world.data.owner.id !== this.peer.data.id_user) return false;

          const checkBlock = (pos: number) => this.world.data.blocks![pos];
          const bedrock = checkBlock(block.x + (block.y + 1) * this.world.data.width);
          if (checkBlock(block.x + block.y * this.world.data.width).fg || (bedrock.fg && bedrock.fg !== 8)) {
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "There's some block blocking the way", 0, 1));
            return false;
          }
          const oldMainDoor = this.world.data.blocks.find((block) => block.fg === 6) || {
            x: block.x,
            y: block.y,
            fg: block.fg,
            bg: block.bg
          };
          const oldMainBedrock = this.world.data.blocks![oldMainDoor.x + (oldMainDoor.y + 1) * this.world.data.width];

          const newBlock: Block[] = [
            {
              x: block.x,
              y: block.y,
              fg: 6,
              bg: block.bg,
              door: { label: "EXIT", destination: "EXIT" }
            },
            {
              x: block.x,
              y: block.y + 1,
              fg: 8,
              bg: bedrock.bg
            }
          ];

          if (oldMainDoor.fg) {
            oldMainDoor.fg = 0;
            oldMainDoor.bg = 0;
            oldMainDoor.door = undefined;
          }
          if (oldMainBedrock.fg) {
            oldMainBedrock.fg = 0;
            oldMainBedrock.bg = 0;
          }
          newBlock.forEach((b) => {
            this.world.data.blocks[b.x + b.y * this.world.data.width] = b;
          });

          this.peer.removeItemInven(1404, 1);
          this.peer.everyPeer((p) => {
            if (p.data.world === this.peer.data.world && p.data.world !== "EXIT") {
              p.leaveWorld();
            }
          });
          return true;
        } else {
          return false;
        }
        break;
      }
    }
  }

  public onPlace(): void {
    const tankData = this.tank.data as Tank;
    const pos = (tankData.xPunch as number) + (tankData.yPunch as number) * this.world.data.width;
    const block = this.world.data.blocks[pos];
    //prettier-ignore
    const isBg = this.base.items.metadata.items[tankData.info as number].type === ActionTypes.BACKGROUND || this.base.items.metadata.items[tankData.info as number].type === ActionTypes.SHEET_MUSIC;
    const placedItem = this.base.items.metadata.items.find((i) => i.id === this.tank.data?.info);
    const mLock = this.base.locks.find((l) => l.id === placedItem?.id);
    const mainLock = block.lock ? this.world.data.blocks[(block.lock.ownerX as number) + (block.lock.ownerY as number) * this.world.data.width] : null;

    if (!placedItem || !placedItem.id) return;
    if (tankData.info === 18 || tankData.info === 32) return;

    if (this.world.data.owner) {
      // if (placedItem.id === 242 || placedItem.id === 4802) return;
      if (!mLock && placedItem.type === ActionTypes.LOCK) {
        this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Uhh, world already locked.", 0, 1));
        return;
      }
      if (this.world.data.owner.id !== this.peer.data?.id_user) {
        if (this.peer.data?.role !== Role.DEVELOPER) {
          this.peer.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
          return;
        }
      }
    } else {
      if (this.peer.data?.role !== Role.DEVELOPER) {
        if (mainLock && mainLock.lock?.ownerUserID !== this.peer.data?.id_user) {
          this.peer.send(Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
          return;
        }
      }
    }

    if (placedItem.id === 8 || placedItem.id === 6 || placedItem.id === 1000 || placedItem.id === 3760 || placedItem.id === 7372) {
      if (this.peer.data?.role !== Role.DEVELOPER) {
        this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Can't place that block."), Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
        return;
      }
    }

    if (block.fg === 2946) {
      block.dblockID = placedItem.id;
      if (placedItem.collisionType === 1) {
        this.peer.removeItemInven(this.tank.data?.info as number, 1);
        this.tileUpdate(ActionTypes.DISPLAY_BLOCK, block);
        this.peer.inventory();
        return;
      }
      this.tileUpdate(ActionTypes.DISPLAY_BLOCK, block);
    }

    if (placedItem.type === ActionTypes.CONSUMABLE) {
      this.onConsumable(placedItem, block);
      return;
    }

    const placed = this.onPlaced({
      actionType: placedItem.type as number,
      flags: placedItem.flags as number,
      block,
      id: placedItem.id,
      isBg
    });

    if (placed) this.peer.removeItemInven(this.tank.data?.info as number, 1);
    this.peer.inventory();
    this.peer.saveToCache();
    this.peer.saveToCache();
    return;
  }

  public onPlaced(p: PlacedArg) {
    if (p.block.fg === 2946 && p.actionType !== ActionTypes.DISPLAY_BLOCK) return false;

    // prevent replace a block to others
    if (p.block.fg && p.flags & BlockFlags.WRENCHABLE) return false;
    if (p.block.fg && !p.block.bg) return false;
    if (p.block.fg && p.actionType === ActionTypes.PLATFORM) return false;

    switch (p.actionType) {
      case ActionTypes.SHEET_MUSIC:
      case ActionTypes.BEDROCK:
      case ActionTypes.LAVA:
      case ActionTypes.PLATFORM:
      case ActionTypes.FOREGROUND:
      case ActionTypes.BACKGROUND: {
        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileVisualUpdate(p.block, 0x0, true);

        return true;
      }

      case ActionTypes.STEAMPUNK:
      case ActionTypes.CHECKPOINT: {
        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);
        return true;
      }

      case ActionTypes.PORTAL:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        p.block.door = { label: "", destination: "", id: "", locked: false };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        return true;
      }

      case ActionTypes.MANNEQUIN: {
        p.block.mannequin = {
          label: "",
          hairColor: 0,
          hair: 12288,
          shirt: 0,
          pants: 0,
          feet: 0,
          face: 0,
          hand: 0,
          back: 0,
          mask: 0,
          neck: 0
        };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      case ActionTypes.WEATHER_MACHINE: {
        p.block.toggleable = {
          open: false,
          public: false
        };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);
        return true;
      }

      case ActionTypes.DICE: {
        p.block.dice = 0;

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);
        return true;
      }

      case ActionTypes.SWITCHEROO: {
        p.block.toggleable = {
          open: false,
          public: false
        };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);
        return true;
      }

      case ActionTypes.SIGN: {
        p.block.sign = { label: "" };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);
        return true;
      }

      case ActionTypes.HEART_MONITOR: {
        p.block.heartMonitor = {
          name: this.peer.data.tankIDName,
          user_id: parseInt(this.peer.data?.id_user as string)
        };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      case ActionTypes.LOCK: {
        const mLock = this.base.locks.find((l) => l.id === p.id);
        if (mLock) {
          if (p.block.lock) {
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "This area is `4already locked``", 0, 1));
            return false;
          }

          if (typeof this.world.data.owner?.id === "number" && this.world.data.owner.id !== this.peer.data?.id_user) {
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "The tile owner `2allows`` public building but `4not`` for this specific block.", 0, 1));
            return false;
          }

          this.world.place({
            peer: this.peer,
            x: p.block.x,
            y: p.block.y,
            isBg: p.isBg,
            id: p.id
          });

          const algo = new Floodfill({
            s_node: { x: p.block.x, y: p.block.y },
            max: mLock.maxTiles,
            width: this.world.data.width,
            height: this.world.data.height,
            blocks: this.world.data.blocks,
            s_block: p.block,
            base: this.base,
            noEmptyAir: false
          });

          algo.exec();
          algo.apply(this.world, this.peer);
          this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Area locked.", 0, 1));

          return true;
        }
        if (this.world.data.blocks?.find((b) => b.lock?.ownerUserID && b.lock.ownerUserID !== this.peer.data?.id_user)) {
          this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Can't put lock, there's other locks around here.", 0, 1));
          return false;
        }

        if (p.block.x === 0 && p.block.y === 0) {
          this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "You `4cannot`` place locks over here!", 0, 1));
          return false;
        }

        p.block.worldLock = true;
        if (!p.block.lock) {
          p.block.lock = {
            ownerUserID: this.peer.data?.id_user as number
          };
        }
        this.world.data.owner = {
          id: this.peer.data?.id_user as number,
          name: this.peer.data?.tankIDName as string,
          displayName: this.peer.name
        };

        this.world.data.bpm = 100;

        this.peer.everyPeer((pa) => {
          if (pa.data?.world === this.peer.data?.world && pa.data?.world !== "EXIT")
            pa.send(
              Variant.from("OnTalkBubble", this.peer.data.netID, `\`3[\`w${this.world.worldName} \`ohas been World Locked by ${this.peer.name}\`3]`),
              Variant.from("OnConsoleMessage", `\`3[\`w${this.world.worldName} \`ohas been World Locked by ${this.peer.name}\`3]`),
              Variant.from({ netID: this.peer.data?.netID }, "OnPlayPositioned", "audio/use_lock.wav")
            );
        });

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      case ActionTypes.DISPLAY_BLOCK: {
        p.block.dblockID = 0;

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      case ActionTypes.SEED: {
        if (p.block.fg !== 0) return false;

        const item = this.base.items.metadata.items[p.id];
        const fruitCount = Math.floor(Math.random() * 10 * (1 - (item.rarity || 0) / 1000)) + 1;
        const now = Date.now();

        p.block.tree = {
          fruit: p.id - 1,
          fruitCount: fruitCount,
          fullyGrownAt: now + (item.growTime || 0) * 1000,
          plantedAt: now
        };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          id: p.id,
          fruit: fruitCount > 4 ? 4 : fruitCount
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      case ActionTypes.PROVIDER: {
        p.block.provider = {
          date: Date.now()
        };

        this.world.place({
          peer: this.peer,
          x: p.block.x,
          y: p.block.y,
          isBg: p.isBg,
          id: p.id
        });

        this.tileUpdate(p.actionType, p.block);

        return true;
      }

      default: {
        this.base.log.debug("Unknown block placing", { actionType: p.actionType, block: p.block });
        return false;
      }
    }
  }
}
