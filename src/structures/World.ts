// BIKIN WORLD & HUBUNING USERS SAMA WORLDNYA KE DATABASE

import { TankPacket, TextPacket, Variant } from "growsockets";
import { PeerDataType } from "../types/peer";
import { Flags } from "../utils/enums/Tiles";
import { Block, EnterArg, Place, WorldData } from "../types/world";
import { BaseServer } from "./BaseServer";
import { WORLD_SIZE, Y_END_DIRT, Y_LAVA_START, Y_START_DIRT } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { HandleTile } from "./TileExtra";
import { Peer } from "./Peer";
import { DataTypes } from "../utils/enums/DataTypes";

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

  public async saveToDatabase() {
    const wrld = this.getWorldCache(this.worldName)!;
    const world = await this.base.database.getWorld(this.worldName);
    if (world) {
      await this.base.database.updateWorld({
        name: wrld.worldName,
        ownedBy: wrld.data.owner ? `${wrld.data.owner.id}` : null,
        blockCount: wrld.data.blockCount!,
        width: wrld.data.width!,
        height: wrld.data.height!,
        blocks: Buffer.from(JSON.stringify(wrld.data.blocks)),
        owner: wrld.data.owner ? Buffer.from(JSON.stringify(wrld.data.owner)) : null
      });
    } else {
      await this.base.database.saveWorld({
        name: wrld?.data.name!,
        ownedBy: wrld?.data.owner ? `${wrld.data.owner.id}` : null,
        blockCount: wrld?.data.blockCount!,
        width: wrld?.data.width!,
        height: wrld?.data.height!,
        blocks: Buffer.from(JSON.stringify(wrld?.data.blocks!)),
        owner: wrld.data.owner ? Buffer.from(JSON.stringify(wrld?.data.owner!)) : null
      });
    }
  }

  public place({ peer, x, y, isBg, id }: Place) {
    let state = 0x8;

    const block = this.data.blocks![x + y * this.data.width!];
    block[isBg ? "bg" : "fg"] = id;

    if (peer.data.rotatedLeft) {
      state |= 0x10;
      block.rotatedLeft = true;
    }

    peer.everyPeer((p) => {
      if (p.data.world === this.data.name && p.data.world !== "EXIT") {
        const packet = TankPacket.from({
          type: TankTypes.TILE_PUNCH,
          netID: peer.data.netID,
          state,
          info: id,
          xPunch: x,
          yPunch: y
        });
        p.send(packet.parse());
      }
    });
  }

  public leave(peer: Peer, sendMenu = true) {
    this.data.playerCount!--;

    peer.send(
      TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|audio/door_shut.wav`, `delayMS|0`)
    );
    peer.everyPeer((p) => {
      if (
        p.data.netID !== peer.data.netID &&
        p.data.world !== "EXIT" &&
        p.data.world === peer.data.world
      )
        p.send(
          Variant.from("OnRemove", `netID|${peer.data.netID}`),
          Variant.from(
            "OnConsoleMessage",
            `\`5<${peer.name}\`\` left, \`w${this.data.playerCount}\`\` others here\`5>\`\``
          ),
          Variant.from(
            "OnTalkBubble",
            peer.data.netID,
            `\`5<${peer.name}\`\` left, \`w${this.data.playerCount}\`\` others here\`5>\`\``
          ),
          TextPacket.from(
            DataTypes.ACTION,
            "action|play_sfx",
            `file|audio/door_shut.wav`,
            `delayMS|0`
          )
        );
    });

    if (sendMenu)
      peer.send(
        Variant.from({ delay: 500 }, "OnRequestWorldSelectMenu"),
        Variant.from({ delay: 500 }, "OnConsoleMessage", `Where do you want to go?`)
      );

    peer.data.world = "EXIT";
    this.saveToCache();
    peer.saveToCache();
    // this.saveToDatabase();
    // peer.saveToDatabase();
    if (this.data.playerCount! < 1) {
      // TODO: delete the cache (if needed) & save it to db
    }
  }

  public async getData() {
    if (!this.base.cache.worlds.has(this.worldName)) {
      const world = await this.base.database.getWorld(this.worldName);
      if (world) {
        this.data = {
          name: world.name,
          width: world.width,
          height: world.height,
          blockCount: world.blockCount,
          blocks: JSON.parse(world.blocks?.toString()!),
          admins: [],
          playerCount: 0,
          jammers: [],
          dropped: {
            uid: 0,
            items: []
          },
          owner: world.owner ? JSON.parse(world.owner?.toString()!) : null
        };
      } else {
        this.generate(true);
      }
    } else this.data = this.base.cache.worlds.get(this.worldName)!.data;
  }

  public async enter(peer: Peer, { x, y }: EnterArg) {
    // this.data = peer.hasWorld(this.worldName).data;
    // console.log(this.base.cache.worlds.get(worldName));
    await this.getData();

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

          let blockBuf = HandleTile(this.base, block, this, item?.type);

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
          `userID|${peer.data.id_user}\n` + // taro di peer nanti
          `colrect|0|0|20|30\n` +
          `posXY|${peer.data.x}|${peer.data.y}\n` +
          `name|\`w${peer.name}\`\`\n` +
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
        [peer.data.clothing?.hair!, peer.data.clothing?.shirt!, peer.data.clothing?.pants!],
        [peer.data.clothing?.feet!, peer.data.clothing?.face!, peer.data.clothing?.hand!],
        [peer.data.clothing?.back!, peer.data.clothing?.mask!, peer.data.clothing?.necklace!],
        0x8295c3ff,
        [peer.data.clothing?.ances!, 0.0, 0.0]
      )
    );

    if (this.data.owner) {
      peer.send(
        Variant.from(
          "OnConsoleMessage",
          `\`#[\`0\`9World Locked by ${this.data.owner.displayName}\`#]`
        )
      );
    }

    peer.everyPeer((p) => {
      if (
        p.data.netID !== peer.data.netID &&
        p.data.world === peer.data.world &&
        p.data.world !== "EXIT"
      ) {
        p.send(
          Variant.from(
            { delay: -1 },
            "OnSpawn",
            "spawn|avatar\n" +
              `netID|${peer.data.netID}\n` +
              `userID|${peer.data.id_user}\n` +
              `colrect|0|0|20|30\n` +
              `posXY|${peer.data.x}|${peer.data.y}\n` +
              `name|\`w${peer.name}\`\`\n` +
              `country|${peer.data.country}\n` +
              "invis|0\n" +
              "mstate|0\n" +
              "smstate|0\n" +
              "onlineID|\n"
          ),
          Variant.from(
            {
              netID: peer.data.netID
            },
            "OnSetClothing",
            [peer.data.clothing?.hair!, peer.data.clothing?.shirt!, peer.data.clothing?.pants!],
            [peer.data.clothing?.feet!, peer.data.clothing?.face!, peer.data.clothing?.hand!],
            [peer.data.clothing?.back!, peer.data.clothing?.mask!, peer.data.clothing?.necklace!],
            0x8295c3ff,
            [peer.data.clothing?.ances!, 0.0, 0.0]
          ),
          Variant.from(
            "OnConsoleMessage",
            `\`5<${peer.name}\`\` joined, \`w${this.data.playerCount}\`\` others here\`5>\`\``
          ),
          Variant.from(
            "OnTalkBubble",
            peer.data.netID,
            `\`5<${peer.name}\`\` joined, \`w${this.data.playerCount}\`\` others here\`5>\`\``
          ),
          TextPacket.from(
            DataTypes.ACTION,
            "action|play_sfx",
            `file|audio/door_open.wav`,
            `delayMS|0`
          )
        );

        peer.send(
          Variant.from(
            { delay: -1 },
            "OnSpawn",
            "spawn|avatar\n" +
              `netID|${p.data.netID}\n` +
              `userID|${p.data.id_user}\n` +
              `colrect|0|0|20|30\n` +
              `posXY|${p.data.x}|${p.data.y}\n` +
              `name|\`w${p.name}\`\`\n` +
              `country|${p.data.country}\n` +
              "invis|0\n" +
              "mstate|0\n" +
              "smstate|0\n" +
              "onlineID|\n"
          ),
          Variant.from(
            {
              netID: p.data.netID
            },
            "OnSetClothing",
            [p.data.clothing?.hair!, p.data.clothing?.shirt!, p.data.clothing?.pants!],
            [p.data.clothing?.feet!, p.data.clothing?.face!, p.data.clothing?.hand!],
            [p.data.clothing?.back!, p.data.clothing?.mask!, p.data.clothing?.necklace!],
            0x8295c3ff,
            [p.data.clothing?.ances!, 0.0, 0.0]
          )
        );
      }
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
      admins: [], // separate to different table
      playerCount: 0,
      jammers: [], // separate to different table
      dropped: {
        // separate (maybe?) to different table
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
