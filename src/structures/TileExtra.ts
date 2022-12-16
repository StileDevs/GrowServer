import { Action } from "../abstracts/Action";
import { ActionTypes, Options, Flags, ExtraTypes } from "../utils/enums/Tiles";
import { Block } from "../types/world";
import { World } from "./World";
import { BaseServer } from "./BaseServer";
import { find } from "../utils/Utils";

export function HandleTile(base: BaseServer, block: Block, actionType?: number): Buffer {
  let buf: Buffer;
  switch (actionType) {
    case ActionTypes.PORTAL:
    case ActionTypes.DOOR:
    case ActionTypes.MAIN_DOOR: {
      const label = block.door?.label || "";
      buf = Buffer.alloc(12 + label.length);

      buf.writeUInt32LE(block.fg! | (block.bg! << 16));
      buf.writeUint16LE(0x0, 4);
      buf.writeUint16LE(Flags.FLAGS_TILEEXTRA, 6);

      buf.writeUint8(ExtraTypes.DOOR, 8);
      buf.writeUint16LE(label.length, 9);
      buf.write(label, 11);
      // first param locked/not (0x8/0x0)
      buf.writeUint8(0x0, 11 + label.length);

      return buf;
    }

    case ActionTypes.SIGN: {
      const label = block.sign?.label || "";
      buf = Buffer.alloc(15 + label.length);

      buf.writeUInt32LE(block.fg! | (block.bg! << 16));
      buf.writeUint16LE(0x0, 4);
      buf.writeUint16LE(Flags.FLAGS_TILEEXTRA, 6);

      buf.writeUint8(ExtraTypes.SIGN, 8);
      buf.writeUint16LE(label.length, 9);
      buf.write(label, 11);
      buf.writeInt32LE(-1, 11 + label.length);

      return buf;
    }

    case ActionTypes.HEART_MONITOR: {
      // ET ID ID ID ID NL NL <name>

      const name = block.heartMonitor?.name || "";
      const id = block.heartMonitor?.user_id || 0;
      let tileExtra = Flags.FLAGS_TILEEXTRA;

      // Check if the peer offline/online
      const targetPeer = find(base.cache.users, (p) => p.data.id_user === id);
      if (targetPeer) {
        tileExtra = Flags.FLAGS_TILEEXTRA | Flags.FLAGS_OPEN;
      }

      buf = Buffer.alloc(15 + name.length);

      buf.writeUInt32LE(block.fg! | (block.bg! << 16));
      buf.writeUint16LE(0x0, 4);
      buf.writeUint16LE(tileExtra, 6);

      buf.writeUint8(ExtraTypes.HEART_MONITOR, 8);
      buf.writeUint32LE(id, 9);
      buf.writeUint16LE(name.length, 13);
      buf.write(name, 15);

      return buf;
    }

    default: {
      buf = Buffer.alloc(8);

      buf.writeUInt32LE(block.fg! | (block.bg! << 16));
      buf.writeUint16LE(0x0, 4);
      buf.writeUint16LE(Flags.FLAGS_PUBLIC, 6);

      return buf;
    }
  }
}
