// BIKIN WORLD & HUBUNING USERS SAMA WORLDNYA KE DATABASE

import { Peer, TankPacket, Variant } from "growsockets";
import { PeerDataType } from "../types/peer";
import { Flags } from "../utils/enums/Tiles";
import { Block, EnterArg, WorldData } from "../types/worlds";
import { BaseServer } from "./BaseServer";
import { WORLD_SIZE, Y_END_DIRT, Y_LAVA_START, Y_START_DIRT } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { TileExtras } from "./TileExtra";

const write = (arr: number[], int: number, size: number) => {
  arr.push(int & 0x000000ff);

  if (size > 1) arr.push((int & 0x0000ff00) >> 8);
  if (size > 2) arr.push((int & 0x00ff0000) >> 16);
  if (size > 3) arr.push((int & 0xff000000) >> 24);
};

export class World {
  public data: WorldData = {};
  public worldName;

  constructor(private base: BaseServer, worldName: string) {
    this.base = base;
    this.worldName = worldName;
  }

  public async enter(peer: Peer<PeerDataType>, { x, y }: EnterArg) {
    if (!this.base.cache.worlds.has(this.worldName)) await this.generate(true);
    else this.data = this.base.cache.worlds.get(this.worldName)!.data;

    if (typeof x !== "number") x = -1;
    if (typeof y !== "number") y = -1;

    const tank = TankPacket.from({
      type: TankTypes.PEER_WORLD,
      data: () => {
        // Terakhir disini World data, tinggal kasih block2 aja
        const HEADER_LENGTH = this.worldName.length + 20;
        const buffer = Buffer.alloc(HEADER_LENGTH);

        buffer.writeUint16LE(0xf);
        buffer.writeUint32LE(0x0, 2);
        buffer.writeUint16LE(this.worldName.length, 6);
        buffer.write(this.worldName, 8);
        buffer.writeUint32LE(this.data.width!, 8 + this.worldName.length);
        buffer.writeUint32LE(this.data.height!, 12 + this.worldName.length);
        buffer.writeUint32LE(this.data.blockCount!, 16 + this.worldName.length);
        // console.log(buffer);

        const blockBytes: any[] = [];
        this.data.blocks?.forEach((block) => {
          let blockBuffer = Buffer.alloc(block.fg === 6 ? 8 + 4 + block.door?.label!.length! : 8);

          blockBuffer.writeUInt32LE(block.fg! | (block.bg! << 16));
          blockBuffer.writeUint16LE(0x0, 4);
          blockBuffer.writeUint16LE(Flags.FLAGS_PUBLIC, 6);
          
          if (block.fg === 6) {
            blockBuffer.writeUint8(0x1, 8);
            blockBuffer.writeUint16LE(block.door?.label!.length!, 9);
            blockBuffer.write(block.door?.label!, 11);
            blockBuffer.writeUint8(0x0, 11 + block.door?.label!.length!);
          }
          blockBuffer.forEach((b) => blockBytes.push(b));
          // blockBytes.push(blockBuffer);
        });

        return Buffer.concat([buffer, Buffer.from(blockBytes)]);
        //return buffer;
        //return Buffer.from(blockBytes);
        //return Buffer.concat([buffer, Buffer.from(blockBytes)]);
      }
    });

    const mainDoor = this.data.blocks!.find((block) => block.fg === 6);

    const xPos = (x < 0 ? mainDoor?.x || 0 : x) * 32,
      yPos = (y < 0 ? mainDoor?.y || 0 : y) * 32;

    peer.send(tank);

    peer.data.x = xPos;
    peer.data.y = yPos;
    peer.data.world = this.worldName;

    peer.send(
      Variant.from(
        { delay: -1 },
        "OnSpawn",
        "spawn|avatar\n" +
          `netID|${peer.data.netID}\n` +
          `userID|0\n` + // taro di peer nanti
          `colrect|0|0|20|30\n` +
          `posXY|${peer.data.x}|${peer.data.y}\n` +
          `name|\`w${"tes"}\`\`\n` +
          `country|us\n` + // country peer
          "invis|0\n" +
          "mstate|0\n" +
          "smstate|0\n" +
          "onlineID|\n" +
          "type|local"
      ),

      Variant.from(
        {
          netID: peer.data.netID
        },
        "OnSetClothing",
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        0x8295c3ff, // skin color
        [0, 0, 0]
      )
    );
  }

  public async generate(cache?: boolean) {
    if (!this.worldName) throw new Error("World name required.");
    const width = WORLD_SIZE.WIDTH;
    const height = WORLD_SIZE.HEIGHT;
    const blockCount = height * width;

    const data: WorldData = {
      name: this.worldName,
      width,
      height,
      blockCount,
      blocks: [],
      admins: [],
      playerCount: 0,
      jammers: [],
      dropped: {
        uid: 0,
        items: []
      }
    };

    // starting points
    let x = 0;
    let y = 0;
    // main door location
    const mainDoorPosition = Math.floor(Math.random() * width);

    for (let i = 0; i < blockCount; i++) {
      // increase y axis, reset back to 0
      if (x >= width) {
        y++;
        x = 0;
      }

      const block: Block = { x, y };
      block.fg = 0;
      block.bg = 0;

      if (block.y === Y_START_DIRT - 1 && block.x === mainDoorPosition) {
        block.fg = 6;
        block.door = {
          label: "EXIT",
          destination: "EXIT"
        };
      } else if (block.y! >= Y_START_DIRT) {
        block.fg =
          block.x === mainDoorPosition && block.y === Y_START_DIRT
            ? 8
            : block.y! < Y_END_DIRT
            ? block.y! >= Y_LAVA_START
              ? Math.random() > 0.2
                ? Math.random() > 0.1
                  ? 2
                  : 10
                : 4
              : Math.random() > 0.01
              ? 2
              : 10
            : 8;
        block.bg = 14;
      }

      data.blocks!.push(block);

      x++;
    }
    this.data = data;
    if (cache) this.base.cache.worlds.set(this.worldName, this);
  }

  public add_lock_data_to_packet(block: Block, buffer: Buffer) {
    if (!block.lock) return;
    const newBuf = Buffer.alloc(buffer.length + 2);
    buffer.copy(newBuf, 0, 0, 8);

    const lockPos = block.lock.ownerX! + block.lock.ownerY! * this.data.width!;
    const flag = newBuf.readUInt16LE(6);

    newBuf.writeUInt16LE(lockPos, 4);
    newBuf.writeUInt16LE(flag | Flags.FLAGS_LOCKED, 6);
    newBuf.writeUInt16LE(lockPos, 8);

    buffer.copy(newBuf, 10, 8);
    return newBuf;
  }
}
