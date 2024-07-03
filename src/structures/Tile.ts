import { Action } from "../abstracts/Action.js";
import { ActionTypes, Options, Flags, ExtraTypes } from "../utils/enums/Tiles.js";
import type { Block } from "../types";
import { World } from "./World.js";
import { BaseServer } from "./BaseServer.js";
import { find } from "../utils/Utils.js";
import { IBuffer } from "./IBuffer.js";

export class Tile {
  public base: BaseServer;
  public world: World;
  public block: Block;

  constructor(base: BaseServer, world: World, block: Block) {
    this.base = base;
    this.world = world;
    this.block = block;
  }

  public serializeBlockData(buf: IBuffer, opts: { lockPos: number; flagTile: number }) {
    buf.writeU32(this.block.fg | (this.block.bg << 16));
    buf.writeU16(opts.lockPos);
    buf.writeU16(opts.flagTile);
  }

  public serialize(actionType: number): Buffer {
    let buf: IBuffer;
    const lockPos = this.block.lock && !this.block.lock.isOwner ? (this.block.lock.ownerX as number) + (this.block.lock.ownerY as number) * this.world.data.width : 0;

    switch (actionType) {
      case ActionTypes.PORTAL:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        const label = this.block.door?.label || "";
        buf = new IBuffer(12 + label.length);

        this.serializeBlockData(buf, { lockPos, flagTile: Flags.FLAGS_TILEEXTRA });

        buf.writeU8(ExtraTypes.DOOR);
        buf.writeString(label);
        // first param locked/not (0x8/0x0)
        buf.writeU8(0x0);

        return buf.data;
      }

      case ActionTypes.SIGN: {
        let flag = 0x0;
        const label = this.block.sign?.label || "";
        buf = new IBuffer(15 + label.length);

        flag |= Flags.FLAGS_TILEEXTRA;
        if (this.block.rotatedLeft) flag |= Flags.FLAGS_ROTATED_LEFT;

        this.serializeBlockData(buf, { lockPos, flagTile: flag });

        buf.writeU8(ExtraTypes.SIGN);
        buf.writeString(label);
        buf.writeI32(-1);

        return buf.data;
      }

      case ActionTypes.HEART_MONITOR: {
        // ET ID ID ID ID NL NL <name>

        const name = this.block.heartMonitor?.name || "";
        const id = this.block.heartMonitor?.user_id || 0;
        let flag = 0x0;

        // Check if the peer offline/online
        const targetPeer = this.base.cache.users.findPeer((p) => p.data?.id_user === id);

        if (targetPeer) flag |= Flags.FLAGS_OPEN;
        if (this.block.rotatedLeft) flag |= Flags.FLAGS_ROTATED_LEFT;

        buf = new IBuffer(15 + name.length);

        this.serializeBlockData(buf, { lockPos, flagTile: flag });

        buf.writeU8(ExtraTypes.HEART_MONITOR);
        buf.writeU32(id);
        buf.writeString(name);

        return buf.data;
      }

      case ActionTypes.DISPLAY_BLOCK: {
        buf = new IBuffer(13);

        this.serializeBlockData(buf, { lockPos, flagTile: Flags.FLAGS_TILEEXTRA });

        buf.writeU8(ExtraTypes.DISPLAY_BLOCK);
        buf.writeU32(this.block.dblockID || 0);

        return buf.data;
      }

      case ActionTypes.LOCK: {
        const owner = (this.block.lock ? this.block.lock.ownerUserID : this.world.data.owner?.id) as number;

        // 0 = admincount
        buf = new IBuffer(26 + 4 * 0);

        this.serializeBlockData(buf, { lockPos, flagTile: Flags.FLAGS_TILEEXTRA });

        buf.writeU16(ExtraTypes.LOCK | (0x0 << 8));
        buf.writeU32(owner);
        buf.writeU32(0); // admin count
        buf.writeI32(-100);

        return buf.data;
      }

      case ActionTypes.SWITCHEROO: {
        let flag = 0x0;
        buf = new IBuffer(8);

        if (this.block.toggleable?.open) flag |= Flags.FLAGS_OPEN;
        if (this.block.toggleable?.public) flag |= Flags.FLAGS_PUBLIC;

        this.serializeBlockData(buf, { lockPos, flagTile: flag });

        return buf.data;
      }

      case ActionTypes.MANNEQUIN: {
        let flag = 0x0;
        const label = this.block.mannequin?.label || "";
        buf = new IBuffer(34 + label?.length);

        if (this.block.rotatedLeft) flag |= Flags.FLAGS_ROTATED_LEFT;

        this.serializeBlockData(buf, { lockPos, flagTile: flag });

        buf.writeU8(ExtraTypes.MANNEQUIN);
        buf.writeString(label);

        buf.writeU32(this.block.mannequin?.hairColor || 0); // hair color
        buf.writeU8(this.block.mannequin?.unknown_u8 || 0); // unknown
        buf.writeU16(this.block.mannequin?.hair || 0); // hair
        buf.writeU16(this.block.mannequin?.shirt || 0); // shirt
        buf.writeU16(this.block.mannequin?.pants || 0); // pants
        buf.writeU16(this.block.mannequin?.feet || 0); // feet
        buf.writeU16(this.block.mannequin?.face || 0); // face
        buf.writeU16(this.block.mannequin?.hand || 0); // hand
        buf.writeU16(this.block.mannequin?.back || 0); // back
        buf.writeU16(this.block.mannequin?.mask || 0); // mask
        buf.writeU16(this.block.mannequin?.neck || 0); // neck

        return buf.data;
      }

      case ActionTypes.WEATHER_MACHINE: {
        buf = new IBuffer(8);
        this.serializeBlockData(buf, { lockPos, flagTile: 0x0 });
        return buf.data;
      }

      case ActionTypes.DICE: {
        buf = new IBuffer(10);

        this.serializeBlockData(buf, { lockPos, flagTile: Flags.FLAGS_TILEEXTRA });

        buf.writeU8(ExtraTypes.DICE);
        buf.writeU8(this.block.dice || 0);

        return buf.data;
      }

      case ActionTypes.SEED: {
        const flag = 0x0;
        buf = new IBuffer(14);

        this.serializeBlockData(buf, { lockPos, flagTile: flag });

        buf.writeU8(ExtraTypes.SEED);
        buf.writeU32(Math.floor((Date.now() - (this.block.tree?.plantedAt as number)) / 1000));
        buf.writeU8((this.block.tree?.fruitCount as number) > 4 ? 4 : (this.block.tree?.fruitCount as number));

        return buf.data;
      }

      default: {
        buf = new IBuffer(8);
        this.serializeBlockData(buf, { lockPos, flagTile: 0x0 });
        return buf.data;
      }
    }
  }
}
