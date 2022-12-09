import { Action } from "../abstracts/Action";
import { ActionTypes, Options, Flags, ExtraTypes } from "../utils/enums/Tiles";
import { Block } from "../types/world";
import { World } from "./World";

export function HandleTile(block: Block, actionType?: number): Buffer {
  let buf: Buffer;
  switch (actionType) {
    case ActionTypes.PORTAL:
    case ActionTypes.DOOR:
    case ActionTypes.MAIN_DOOR: {
      const label = block.door?.label || "";
      buf = Buffer.alloc(8 + 4 + label.length);

      buf.writeUInt32LE(block.fg! | (block.bg! << 16));
      buf.writeUint16LE(0x0, 4);
      buf.writeUint16LE(Flags.FLAGS_PUBLIC, 6);

      buf.writeUint8(0x1, 8);
      buf.writeUint16LE(label.length, 9);
      buf.write(label, 11);
      buf.writeUint8(0x0, 11 + label.length);

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
