import { TankPacket, TextPacket, Variant } from "growtopia.js";
import { Block, WorldData } from "../types";
import { Base } from "./Base.js";
import { PacketTypes, TankTypes, WORLD_SIZE, Y_END_DIRT, Y_LAVA_START, Y_START_DIRT } from "../Constants.js";
import { Peer } from "./Peer.js";
import { tileParse } from "../world/tiles";

export class World {
  public data: WorldData;
  public worldName;

  constructor(private base: Base, worldName: string) {
    this.base = base;
    this.worldName = worldName;

    const data = this.base.cache.worlds.get(worldName);
    if (data) this.data = data;
    else
      this.data = {
        name: "",
        width: 0,
        height: 0,
        blocks: [],
        weatherId: 41
      };
  }

  public async saveToCache() {
    this.base.cache.worlds.set(this.worldName, this.data);
    return true;
  }

  public async saveToDatabase() {
    const world = this.base.cache.worlds.get(this.worldName);

    if (world) return await this.base.database.worlds.save(this.data);
    else return await this.base.database.worlds.set(this.data);
  }

  public leave(peer: Peer, sendMenu = true) {
    this.data.playerCount ? this.data.playerCount-- : 0;

    peer.data.lastCheckpoint = undefined;

    peer.send(TextPacket.from(PacketTypes.ACTION, "action|play_sfx", "file|audio/door_shut.wav", "delayMS|0"));
    peer.every((p) => {
      if (p.data?.netID !== peer.data?.netID && p.data?.world !== "EXIT" && p.data?.world === peer.data?.world)
        p.send(
          Variant.from("OnRemove", `netID|${peer.data?.netID}`, `pId|${peer.data?.id_user}`),
          Variant.from("OnConsoleMessage", `\`5<${peer.name}\`\` left, \`w${this.data.playerCount}\`\` others here\`5>\`\``),
          Variant.from("OnTalkBubble", peer.data.netID, `\`5<${peer.name}\`\` left, \`w${this.data.playerCount}\`\` others here\`5>\`\``),
          TextPacket.from(PacketTypes.ACTION, "action|play_sfx", "file|audio/door_shut.wav", "delayMS|0")
        );
    });

    if (sendMenu)
      peer.send(
        Variant.from(
          { delay: 500 },
          "OnRequestWorldSelectMenu",
          `
add_heading|Top Worlds|
add_floater|START|0|0.5|3529161471
add_floater|START1|0|0.5|3529161471
add_floater|START2|0|0.5|3529161471
${Array.from(this.base.cache.worlds.values())
  .sort((a, b) => (b.playerCount || 0) - (a.playerCount || 0))
  .slice(0, 6)
  .map((v) => {
    if (v.playerCount) return `add_floater|${v.name}${v.playerCount ? ` (${v.playerCount})` : ""}|0|0.5|3529161471\n`;
    else return "";
  })
  .join("\n")}
add_heading|Recently Visited Worlds<CR>|
${peer.data.lastVisitedWorlds
  ?.reverse()
  .map((v) => {
    const count = this.base.cache.worlds.get(v)?.playerCount || 0;
    return `add_floater|${v}${count ? ` (${count})` : ""}|0|0.5|3417414143\n`;
  })
  .join("\n")}
`
        ),
        Variant.from({ delay: 500 }, "OnConsoleMessage", "Where do you want to go?")
      );

    peer.data.world = "EXIT";
    this.saveToCache();
    peer.saveToCache();

    if ((this.data.playerCount as number) < 1) {
      // TODO: delete the cache (if needed) & save it to db
    }
  }

  public async getData() {
    if (!this.base.cache.worlds.has(this.worldName)) {
      const world = await this.base.database.worlds.get(this.worldName);
      if (world) {
        this.data = {
          name: world.name,
          width: world.width,
          height: world.height,
          blocks: JSON.parse((world.blocks as Buffer).toString()),
          admins: [],
          playerCount: 0,
          jammers: [],
          dropped: world.dropped ? JSON.parse(world.dropped.toString()) : { uid: 0, items: [] },
          owner: world.owner ? JSON.parse(world.owner.toString()) : null,
          weatherId: world.weather_id || 41
        };
      } else {
        this.generate(true);
      }
    } else this.data = this.base.cache.worlds.get(this.worldName) as WorldData;
  }

  public async enter(peer: Peer, x: number, y: number) {
    await this.getData();

    if (typeof x !== "number") x = -1;
    if (typeof y !== "number") y = -1;

    const HEADER_LENGTH = this.worldName.length + 20;
    const buffer = Buffer.alloc(HEADER_LENGTH);
    const blockCount = this.data.height * this.data.width;

    // World data
    buffer.writeUint16LE(0x14);
    buffer.writeUint32LE(0x40, 2);
    buffer.writeUint16LE(this.worldName.length, 6);
    buffer.write(this.worldName, 8);
    buffer.writeUint32LE(this.data.width, 8 + this.worldName.length);
    buffer.writeUint32LE(this.data.height, 12 + this.worldName.length);
    buffer.writeUint32LE(blockCount, 16 + this.worldName.length);

    // Tambahan 5 bytes, gatau ini apaan
    const unk1 = Buffer.alloc(5);

    // Block data
    const blockBytes: number[] = [];

    for (const block of this.data.blocks) {
      const item = this.base.items.metadata.items.find((i) => i.id === block.fg);

      // const blockBuf = new Tile(this.base, this, block).serialize(item?.type as number);
      const type = item?.type as number;
      const blockBuf = await tileParse(type, this, block);

      blockBuf.forEach((b) => blockBytes.push(b));
    }

    // Tambahan 12 bytes, gatau ini apaan
    const unk2 = Buffer.alloc(12);

    // Drop data
    const dropData = Buffer.alloc(8 + (this.data.dropped?.items.length as number) * 16);
    dropData.writeUInt32LE(this.data.dropped?.items.length as number);
    dropData.writeUInt32LE(this.data.dropped?.uid as number, 4);

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
    weatherData.writeUint16LE(this.data.weatherId); // weather id
    weatherData.writeUint16LE(0x1, 2); // on atau off (mungkin)
    weatherData.writeUint32LE(0x0, 4); // ??
    weatherData.writeUint32LE(0x0, 8); // ??

    const worldMap = Buffer.concat([buffer, Buffer.concat([unk1, Buffer.from(blockBytes)]), Buffer.concat([unk2, dropData, weatherData])]);

    const tank = TankPacket.from({
      type: TankTypes.SEND_MAP_DATA,
      state: 8,
      data: () => worldMap
    });

    const mainDoor = this.data.blocks.find((block) => block.fg === 6);

    const xPos = (x < 0 ? mainDoor?.x || 0 : x) * 32;
    const yPos = (y < 0 ? mainDoor?.y || 0 : y) * 32;

    peer.send(tank);
    peer.data.x = xPos;
    peer.data.y = yPos;
    peer.data.world = this.worldName;

    peer.send(
      Variant.from({ delay: -1 }, "OnSpawn", `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.id_user}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|\`w${peer.name}\`\`\ncountry|${peer.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\ntype|local`),

      Variant.from(
        {
          netID: peer.data?.netID
        },
        "OnSetClothing",
        [peer.data.clothing.hair, peer.data.clothing.shirt, peer.data.clothing.pants],
        [peer.data.clothing.feet, peer.data.clothing.face, peer.data.clothing.hand],
        [peer.data.clothing.back, peer.data.clothing.mask, peer.data.clothing.necklace],
        0x8295c3ff,
        [peer.data.clothing.ances, 0.0, 0.0]
      )
    );

    if (this.data.owner) {
      peer.send(Variant.from("OnConsoleMessage", `\`#[\`0\`9World Locked by ${this.data.owner.displayName}\`#]`));
    }

    peer.every((p) => {
      if (p.data?.netID !== peer.data?.netID && p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
        p.send(
          Variant.from({ delay: -1 }, "OnSpawn", `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.id_user}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|\`w${peer.name}\`\`\ncountry|${peer.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`),
          Variant.from(
            {
              netID: peer.data?.netID
            },
            "OnSetClothing",
            [peer.data.clothing.hair, peer.data.clothing.shirt, peer.data.clothing.pants],
            [peer.data.clothing.feet, peer.data.clothing.face, peer.data.clothing.hand],
            [peer.data.clothing.back, peer.data.clothing.mask, peer.data.clothing.necklace],
            0x8295c3ff,
            [peer.data.clothing.ances, 0.0, 0.0]
          ),
          Variant.from("OnConsoleMessage", `\`5<${peer.name}\`\` joined, \`w${this.data.playerCount}\`\` others here\`5>\`\``),
          Variant.from("OnTalkBubble", peer.data.netID, `\`5<${peer.name}\`\` joined, \`w${this.data.playerCount}\`\` others here\`5>\`\``),
          TextPacket.from(PacketTypes.ACTION, "action|play_sfx", "file|audio/door_open.wav", "delayMS|0")
        );

        peer.send(
          Variant.from({ delay: -1 }, "OnSpawn", `spawn|avatar\nnetID|${p.data?.netID}\nuserID|${p.data?.id_user}\ncolrect|0|0|20|30\nposXY|${p.data?.x}|${p.data?.y}\nname|\`w${p.name}\`\`\ncountry|${p.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`),
          Variant.from(
            {
              netID: p.data?.netID
            },
            "OnSetClothing",
            [p.data.clothing.hair, p.data.clothing.shirt, p.data.clothing.pants],
            [p.data.clothing.feet, p.data.clothing.face, p.data.clothing.hand],
            [p.data.clothing.back, p.data.clothing.mask, p.data.clothing.necklace],
            0x8295c3ff,
            [p.data.clothing.ances, 0.0, 0.0]
          )
        );
      }
    });
    this.data.playerCount ? this.data.playerCount++ : 0;

    this.saveToCache();
    peer.saveToCache();
  }

  // We'll using this to generate new world (for now)
  public generate(cache?: boolean) {
    if (!this.worldName) throw new Error("World name required.");
    const width = WORLD_SIZE.WIDTH;
    const height = WORLD_SIZE.HEIGHT;
    const blockCount = height * width;

    const data: WorldData = {
      name: this.worldName,
      width,
      height,
      blocks: [],
      admins: [], // separate to different table
      playerCount: 0,
      jammers: [], // separate to different table
      dropped: {
        // separate (maybe?) to different table
        uid: 0,
        items: []
      },
      weatherId: 41
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

      const block: Block = {
        x,
        y,
        fg: 0,
        bg: 0
      };

      if (block.y === Y_START_DIRT - 1 && block.x === mainDoorPosition) {
        block.fg = 6;
        block.door = {
          label: "EXIT",
          destination: "EXIT"
        };
      } else if (block.y >= Y_START_DIRT) {
        block.fg = block.x === mainDoorPosition && block.y === Y_START_DIRT ? 8 : block.y < Y_END_DIRT ? (block.y >= Y_LAVA_START ? (Math.random() > 0.2 ? (Math.random() > 0.1 ? 2 : 10) : 4) : Math.random() > 0.01 ? 2 : 10) : 8;
        block.bg = 14;
      }

      data.blocks.push(block);

      x++;
    }
    this.data = data;
    if (cache) this.saveToCache();
  }
}
