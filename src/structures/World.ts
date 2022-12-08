// BIKIN WORLD & HUBUNING USERS SAMA WORLDNYA KE DATABASE

import { TankPacket, Variant } from "growsockets";
import { PeerDataType } from "../types/peer";
import { Flags } from "../utils/enums/Tiles";
import { Block, EnterArg, WorldData } from "../types/world";
import { BaseServer } from "./BaseServer";
import { WORLD_SIZE, Y_END_DIRT, Y_LAVA_START, Y_START_DIRT } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { HandleTile } from "./TileExtra";
import { Peer } from "./Peer";

export class World {
  public data: WorldData = {};
  public worldName;

  constructor(private base: BaseServer, worldName: string) {
    this.base = base;
    this.worldName = worldName;
  }

  public saveToCache() {
    this.base.cache.worlds.set(this.worldName, this);
    return;
  }
  public getWorldCache(worldName: string) {
    return this.base.cache.worlds.get(worldName);
  }

  public leave(peer: Peer, sendMenu = true) {
    this.data.playerCount!--;

    peer.everyPeer({ sameWorld: true }, (p) => {
      if (p.data.netID !== peer.data.netID)
        p.send(Variant.from("OnRemove", `netID|${peer.data.netID}`));
    });

    if (sendMenu)
      peer.send(
        Variant.from({ delay: 500 }, "OnRequestWorldSelectMenu"),
        Variant.from({ delay: 500 }, "OnConsoleMessage", `Where do you want to go?`)
      );

    peer.data.world = "EXIT";

    peer.saveToCache();

    if (this.data.playerCount! < 1) {
      // TODO: delete the cache (if needed) & save it to db
    }
  }

  public enter(peer: Peer, { x, y }: EnterArg) {
    if (!this.base.cache.worlds.has(this.worldName)) this.generate(true);
    else this.data = this.base.cache.worlds.get(this.worldName)!.data;

    if (typeof x !== "number") x = -1;
    if (typeof y !== "number") y = -1;

    const tank = TankPacket.from({
      type: TankTypes.PEER_WORLD,
      state: 8,
      data: () => {
        const HEADER_LENGTH = this.worldName.length + 20;
        const buffer = Buffer.alloc(HEADER_LENGTH);

        // World data
        buffer.writeUint16LE(0x14);
        buffer.writeUint32LE(0x40, 2);
        buffer.writeUint16LE(this.worldName.length, 6);
        buffer.write(this.worldName, 8);
        buffer.writeUint32LE(this.data.width!, 8 + this.worldName.length);
        buffer.writeUint32LE(this.data.height!, 12 + this.worldName.length);
        buffer.writeUint32LE(this.data.blockCount!, 16 + this.worldName.length);

        // Block data
        const blockBytes: any[] = [];
        this.data.blocks?.forEach((block) => {
          let item = this.base.items.metadata.items.find((i) => i.id === block.fg);

          let blockBuf = HandleTile(block, item?.type);

          blockBuf.forEach((b) => blockBytes.push(b));
        });

        // Drop data
        const dropData = Buffer.alloc(8 + this.data.dropped?.items.length! * 16);
        dropData.writeUInt32LE(this.data.dropped?.items.length!);
        dropData.writeUInt32LE(this.data.dropped?.uid!);

        let pos = 8;
        this.data.dropped?.items.forEach((item) => {
          dropData.writeUInt16LE(item.id, pos);
          dropData.writeFloatLE(item.x, pos + 2);
          dropData.writeFloatLE(item.y, pos + 6);
          dropData.writeUInt8(item.amount < -1 ? 0 : item.amount, pos + 10);
          // ignore flags / 0x0
          dropData.writeUInt32LE(item.uid, pos + 12);

          pos += 16;
        });

        // Weather
        const weatherData = Buffer.alloc(12);
        weatherData.writeUint16LE(0);
        weatherData.writeUint16LE(0x1, 2);
        weatherData.writeUint32LE(0x0, 4);
        weatherData.writeUint32LE(0x0, 8);

        return Buffer.concat([
          buffer,
          Buffer.from(blockBytes),
          Buffer.concat([dropData, weatherData])
        ]);
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
          `name|\`w${peer.data.tankIDName}\`\`\n` +
          `country|${peer.data.country}\n` + // country peer
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

    peer.everyPeer({ sameWorld: true }, (p) => {
      p.send(
        Variant.from(
          { delay: -1 },
          "OnSpawn",
          "spawn|avatar\n" +
            `netID|${peer.data.netID}\n` +
            `userID|0\n` + // taro di peer nanti
            `colrect|0|0|20|30\n` +
            `posXY|${peer.data.x}|${peer.data.y}\n` +
            `name|\`w${peer.data.tankIDName}\`\`\n` +
            `country|${peer.data.country}\n` + // country peer
            "invis|0\n" +
            "mstate|0\n" +
            "smstate|0\n" +
            "onlineID|\n" +
            "type|local"
        ),
        Variant.from(
          {
            netID: p.data.netID
          },
          "OnSetClothing",
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          0x8295c3ff, // skin color
          [0, 0, 0]
        )
      );

      peer.send(
        Variant.from(
          { delay: -1 },
          "OnSpawn",
          "spawn|avatar\n" +
            `netID|${p.data.netID}\n` +
            `userID|0\n` + // taro di peer nanti
            `colrect|0|0|20|30\n` +
            `posXY|${p.data.x}|${p.data.y}\n` +
            `name|\`w${p.data.tankIDName}\`\`\n` +
            `country|${p.data.country}\n` + // country peer
            "invis|0\n" +
            "mstate|0\n" +
            "smstate|0\n" +
            "onlineID|\n" +
            "type|local"
        ),
        Variant.from(
          {
            netID: p.data.netID
          },
          "OnSetClothing",
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          0x8295c3ff, // skin color
          [0, 0, 0]
        )
      );
    });
    this.data.playerCount!++;

    this.saveToCache();
    peer.saveToCache();
  }

  public generate(cache?: boolean) {
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
    if (cache) this.saveToCache();
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
