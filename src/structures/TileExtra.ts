import { Action } from "../abstracts/Action";
import { ActionTypes, Options, Flags, ExtraTypes } from "../utils/enums/Tiles";
import { Block } from "../types/worlds";
import { World } from "./World";

export const TileExtras = {
  [ActionTypes.LOCK]: (world: World, block: Block) => {
    const owner = block.lock ? block.lock.ownerUserID : world.data.owner;
    const admins = block.lock ? block.lock.adminIDs : world.data.admins;

    const adminCount = admins!.length + 1;
    let buffer = Buffer.alloc(26 + 4 * adminCount);

    let visuals = 0x0;

    if (world.data.customMusicBlocksDisabled) visuals |= Options.MUSIC_BLOCKS_DISABLED;

    if (world.data.invisMusicBlocks) visuals |= Options.MUSIC_BLOCKS_INVIS;

    buffer.writeUInt32LE(block.fg! | (block.bg! << 16));
    buffer.writeUInt16LE(Flags.FLAGS_TILEEXTRA, 6);
    buffer.writeUInt16LE(ExtraTypes.LOCK | (visuals << 8), 8);
    buffer.writeUInt32LE(owner!, 10);
    buffer.writeUInt32LE(adminCount, 14); // admin count
    buffer.writeInt32LE(
      world.data.bpm! >= 20 && world.data.bpm! <= 200 ? world.data.bpm! * -1 : -100,
      18
    );

    let pos = 22;
    admins!.forEach((id) => {
      buffer.writeUInt32LE(id, pos);
      pos += 4;
    });

    return buffer;
  },

  [ActionTypes.MAIN_DOOR]: (world: World, block: Block) => {
    const label = block.door?.label ?? "";
    const size = 12 + label.length;
    let buffer = Buffer.alloc(size);

    buffer.writeUInt32LE(block.fg! | (block.bg! << 16));
    buffer.writeUInt16LE(Flags.FLAGS_TILEEXTRA, 6);
    buffer.writeUInt8(ExtraTypes.DOOR, 8);
    buffer.writeUInt16LE(label.length, 9);
    buffer.write(label, 11);
    buffer.writeUInt8(block.door?.locked ? 0x8 : 0x0, 11 + label.length);

    if (block.lock) buffer = world.add_lock_data_to_packet(block, buffer)!;

    return buffer;
  },

  [ActionTypes.BOOMBOX]: (world: World, block: Block) => {
    let buffer = Buffer.alloc(8);
    let flag = 0x0;

    if (block.boombox?.open) flag |= Flags.FLAGS_OPEN;
    if (block.boombox?.public) flag |= Flags.FLAGS_PUBLIC;
    if (block.boombox?.silenced) flag |= Flags.FLAGS_SILENCED;

    if (block.rotatedLeft) flag |= Flags.FLAGS_ROTATED_LEFT;

    buffer.writeUInt32LE(block.fg! | (block.bg! << 16));
    buffer.writeUInt16LE(flag, 6);

    if (block.lock) buffer = world.add_lock_data_to_packet(block, buffer)!;

    return buffer;
  },

  [ActionTypes.SIGN]: (world: World, block: Block) => {
    const label = block.sign?.label ?? "";
    const size = 15 + label.length;
    let buffer = Buffer.alloc(size);

    let flag = Flags.FLAGS_TILEEXTRA;
    if (block.rotatedLeft) flag |= Flags.FLAGS_ROTATED_LEFT;

    buffer.writeUInt32LE(block.fg! | (block.bg! << 16));
    buffer.writeUInt16LE(flag, 6);
    buffer.writeUInt8(ExtraTypes.SIGN, 8);
    buffer.writeUInt16LE(label.length, 9);
    buffer.write(label, 11);
    buffer.writeInt32LE(-1, 11 + label.length);

    if (block.lock) buffer = world.add_lock_data_to_packet(block, buffer)!;

    return buffer;
  },

  [ActionTypes.ENTRANCE]: (world: World, block: Block) => {
    let buffer = Buffer.alloc(8);
    let flag = 0x0;

    if (block.entrace?.open) flag |= Flags.FLAGS_PUBLIC;
    if (block.rotatedLeft) flag |= Flags.FLAGS_ROTATED_LEFT;

    buffer.writeUInt32LE(block.fg! | (block.bg! << 16));
    buffer.writeUInt16LE(flag, 6);

    if (block.lock) buffer = world.add_lock_data_to_packet(block, buffer)!;

    return buffer;
  },

  [ActionTypes.SEED]: (world: World, block: Block) => {
    let buffer = Buffer.alloc(14); // fg fg bg bg xy xy tt tt ET TM TM TM TM FC

    buffer.writeUInt32LE(block.fg! | (block.bg! << 16));
    buffer.writeUInt16LE(Flags.FLAGS_TREE, 6);
    buffer.writeUInt8(ExtraTypes.TREE, 8);

    buffer.writeUInt32LE(Math.floor((Date.now() - block.tree?.plantedAt!) / 1000), 9);

    buffer.writeUInt8(block.tree?.fruitCount! > 4 ? 4 : block.tree?.fruitCount!, 13);

    if (block.lock) buffer = world.add_lock_data_to_packet(block, buffer)!;

    return buffer;
  },

  default: (world: World, block: Block) => {
    let buffer = Buffer.alloc(8);
    buffer.writeUInt32LE(block.fg! | (block.bg! << 16));

    if (block.lock) buffer = world.add_lock_data_to_packet(block, buffer)!;

    return buffer;
  }
};

//TileExtras[ActionTypes.DOOR] = TileExtras[ActionTypes.MAIN_DOOR];
//TileExtras[ActionTypes.PORTAL] = TileExtras[ActionTypes.MAIN_DOOR];
