import { Action } from "../abstracts/Action";
import { ActionTypes, Options, Flags, ExtraTypes } from "../utils/enums/Tiles";
import { Block } from "../types/worlds";
import { World } from "./World";

export function HandleTile(block: Block, actionType?: number): Buffer {
  switch (actionType) {
    case ActionTypes.PORTAL:
    case ActionTypes.DOOR:
    case ActionTypes.MAIN_DOOR: {
      let buf = Buffer.alloc(8 + 4 + block?.door?.label!.length!);
      buf.writeUInt32LE(block.fg! | (block.bg! << 16));
      // buf.writeUint16LE(0x0, 4);
      // buf.writeUint16LE(Flags.FLAGS_PUBLIC, 6);

      buf.writeUint8(0x1, 8);
      buf.writeUint16LE(block.door?.label!.length!, 9);
      buf.write(block.door?.label!, 11);
      buf.writeUint8(0x0, 11 + block.door?.label!.length!);

      return buf;
    }
    default: {
      let buf = Buffer.alloc(8);

      buf.writeUInt32LE(block.fg! | (block.bg! << 16));
      // buf.writeUint16LE(0x0, 4);
      // buf.writeUint16LE(Flags.FLAGS_PUBLIC, 6);

      return buf;
    }
  }
}
