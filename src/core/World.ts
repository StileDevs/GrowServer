import { TankPacket, TextPacket, Variant } from "growtopia.js";
import { Block, WorldData } from "../types";
import { Base } from "./Base";
import { PacketTypes, TankTypes } from "../Constants";
import { Peer } from "./Peer";
import { tileParse } from "../world/tiles";
import { Default } from "../world/generation/Default";

export class World {
  public data: WorldData;
  public worldName;

  constructor(
    private base: Base,
    worldName: string
  ) {
    this.base = base;
    this.worldName = worldName;

    const data = this.base.cache.worlds.get(worldName);
    if (data) this.data = data;
    else
      this.data = {
        name:      "",
        width:     0,
        height:    0,
        blocks:    [],
        weatherId: 41
      };
  }

  public async saveToCache() {
    this.base.cache.worlds.set(this.worldName, this.data);
    return true;
  }

  public async saveToDatabase() {
    if (await this.base.database.worlds.has(this.worldName))
      return await this.base.database.worlds.save(this.data);
    else return await this.base.database.worlds.set(this.data);
  }

  public leave(peer: Peer, sendMenu = true) {
    this.data.playerCount = this.data.playerCount
      ? this.data.playerCount - 1
      : 0;

    peer.data.lastCheckpoint = undefined;

    peer.send(
      TextPacket.from(
        PacketTypes.ACTION,
        "action|play_sfx",
        "file|audio/door_shut.wav",
        "delayMS|0"
      )
    );
    peer.every((p) => {
      if (
        p.data?.netID !== peer.data?.netID &&
        p.data?.world !== "EXIT" &&
        p.data?.world === peer.data?.world
      )
        p.send(
          Variant.from(
            "OnRemove",
            `netID|${peer.data?.netID}`,
            `pId|${peer.data?.id_user}`
          ),
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
            PacketTypes.ACTION,
            "action|play_sfx",
            "file|audio/door_shut.wav",
            "delayMS|0"
          )
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
    if (v.playerCount)
      return `add_floater|${v.name}${v.playerCount ? ` (${v.playerCount})` : ""}|0|0.5|3529161471\n`;
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
        Variant.from(
          { delay: 500 },
          "OnConsoleMessage",
          "Where do you want to go?"
        )
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
          name:        world.name,
          width:       world.width,
          height:      world.height,
          blocks:      JSON.parse((world.blocks as Buffer).toString()),
          admins:      [],
          playerCount: 0,
          jammers:     [],
          dropped:     world.dropped
            ? JSON.parse(world.dropped.toString())
            : { uid: 0, items: [] },
          owner:     world.owner ? JSON.parse(world.owner.toString()) : null,
          weatherId: world.weather_id || 41
        };
      } else {
        await this.generate(true);
      }
    } else this.data = this.base.cache.worlds.get(this.worldName) as WorldData;
  }

  public async place(
    peer: Peer,
    x: number,
    y: number,
    id: number,
    isBg: boolean,
    fruitCount?: number
  ) {
    let state = 0x8;

    const block = this.data.blocks[x + y * this.data.width];
    block[isBg ? "bg" : "fg"] = id;

    if (peer.data?.rotatedLeft) {
      state |= 0x10;
      block.rotatedLeft = true;
    }

    peer.every((p) => {
      if (p.data?.world === this.data.name && p.data?.world !== "EXIT") {
        const packet = TankPacket.from({
          type:   TankTypes.ITEM_CHANGE_OBJECT,
          netID:  peer.data?.netID,
          state,
          info:   id,
          xPunch: x,
          yPunch: y
        });

        const buffer = packet.parse() as Buffer;

        buffer[7] = fruitCount || 0;
        p.send(buffer);
      }
    });
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
      const item = this.base.items.metadata.items.find(
        (i) => i.id === block.fg
      );

      // const blockBuf = new Tile(this.base, this, block).serialize(item?.type as number);
      const type = item?.type as number;
      const blockBuf = await tileParse(type, this.base, this, block);

      blockBuf.forEach((b) => blockBytes.push(b));
    }

    // Tambahan 12 bytes, gatau ini apaan
    const unk2 = Buffer.alloc(12);

    // Drop data
    const dropData = Buffer.alloc(
      8 + (this.data.dropped?.items.length as number) * 16
    );
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

    const worldMap = Buffer.concat([
      buffer,
      Buffer.concat([unk1, Buffer.from(blockBytes)]),
      Buffer.concat([unk2, dropData, weatherData])
    ]);

    const tank = TankPacket.from({
      type:  TankTypes.SEND_MAP_DATA,
      state: 8,
      data:  () => worldMap
    });

    const mainDoor = this.data.blocks.find((block) => block.fg === 6);

    const xPos = (x < 0 ? mainDoor?.x || 0 : x) * 32;
    const yPos = (y < 0 ? mainDoor?.y || 0 : y) * 32;

    peer.send(tank);
    peer.data.x = xPos;
    peer.data.y = yPos;
    peer.data.world = this.worldName;

    peer.send(
      Variant.from(
        { delay: -1 },
        "OnSpawn",
        `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.id_user}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|\`w${peer.name}\`\`\ncountry|${peer.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\ntype|local`
      ),

      Variant.from(
        {
          netID: peer.data?.netID
        },
        "OnSetClothing",
        [
          peer.data.clothing.hair,
          peer.data.clothing.shirt,
          peer.data.clothing.pants
        ],
        [
          peer.data.clothing.feet,
          peer.data.clothing.face,
          peer.data.clothing.hand
        ],
        [
          peer.data.clothing.back,
          peer.data.clothing.mask,
          peer.data.clothing.necklace
        ],
        0x8295c3ff,
        [peer.data.clothing.ances, 0.0, 0.0]
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

    peer.every((p) => {
      if (
        p.data?.netID !== peer.data?.netID &&
        p.data?.world === peer.data?.world &&
        p.data?.world !== "EXIT"
      ) {
        p.send(
          Variant.from(
            { delay: -1 },
            "OnSpawn",
            `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.id_user}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|\`w${peer.name}\`\`\ncountry|${peer.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`
          ),
          Variant.from(
            {
              netID: peer.data?.netID
            },
            "OnSetClothing",
            [
              peer.data.clothing.hair,
              peer.data.clothing.shirt,
              peer.data.clothing.pants
            ],
            [
              peer.data.clothing.feet,
              peer.data.clothing.face,
              peer.data.clothing.hand
            ],
            [
              peer.data.clothing.back,
              peer.data.clothing.mask,
              peer.data.clothing.necklace
            ],
            0x8295c3ff,
            [peer.data.clothing.ances, 0.0, 0.0]
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
            PacketTypes.ACTION,
            "action|play_sfx",
            "file|audio/door_open.wav",
            "delayMS|0"
          )
        );

        peer.send(
          Variant.from(
            { delay: -1 },
            "OnSpawn",
            `spawn|avatar\nnetID|${p.data?.netID}\nuserID|${p.data?.id_user}\ncolrect|0|0|20|30\nposXY|${p.data?.x}|${p.data?.y}\nname|\`w${p.name}\`\`\ncountry|${p.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`
          ),
          Variant.from(
            {
              netID: p.data?.netID
            },
            "OnSetClothing",
            [
              p.data.clothing.hair,
              p.data.clothing.shirt,
              p.data.clothing.pants
            ],
            [p.data.clothing.feet, p.data.clothing.face, p.data.clothing.hand],
            [
              p.data.clothing.back,
              p.data.clothing.mask,
              p.data.clothing.necklace
            ],
            0x8295c3ff,
            [p.data.clothing.ances, 0.0, 0.0]
          )
        );
      }
    });
    this.data.playerCount = this.data.playerCount
      ? this.data.playerCount + 1
      : 0;

    this.saveToCache();
    peer.saveToCache();
  }

  public async generate(cache?: boolean) {
    if (!this.worldName) throw new Error("World name required.");
    const worldGen = new Default(this.worldName);

    await worldGen.generate();
    this.data = worldGen.data;
    if (cache) this.saveToCache();
  }

  public drop(
    peer: Peer,
    x: number,
    y: number,
    id: number,
    amount: number,
    { tree, noSimilar }: { tree?: boolean; noSimilar?: boolean } = {}
  ) {
    const tank = TankPacket.from({
      type:        TankTypes.ITEM_CHANGE_OBJECT,
      netID:       -1,
      targetNetID: tree ? -1 : peer.data?.netID,
      state:       0,
      info:        id,
      xPos:        x,
      yPos:        y
    });

    const position = Math.trunc(x / 32) + Math.trunc(y / 32) * this.data.width;
    const block = this.data.blocks[position];

    const similarDrops = noSimilar
      ? null
      : this.data.dropped?.items
        .filter(
          (i) => i.id === id && block.x === i.block.x && block.y === i.block.y
        )
        .sort((a, b) => a.amount - b.amount);

    const similarDrop = Array.isArray(similarDrops) ? similarDrops[0] : null;

    if (similarDrop && similarDrop.amount < 200) {
      if (similarDrop.amount + amount > 200) {
        const extra = similarDrop.amount + amount - 200;

        amount = 0;
        similarDrop.amount = 200;

        this.drop(peer, x, y, id, extra, { tree: true });
      }

      tank.data!.netID = -3;
      tank.data!.targetNetID = similarDrop.uid;

      tank.data!.xPos = similarDrop.x;
      tank.data!.yPos = similarDrop.y;

      amount += similarDrop.amount;

      similarDrop.amount = amount;
    } else
      this.data.dropped?.items.push({
        id,
        amount,
        x,
        y,
        uid:   ++this.data.dropped.uid,
        block: { x: block.x, y: block.y }
      });

    const buffer = tank.parse() as Buffer;
    buffer.writeFloatLE(amount, 20);

    peer.every(
      (p) =>
        p.data?.world === peer.data?.world &&
        p.data?.world !== "EXIT" &&
        p.send(buffer)
    );

    this.saveToCache();
  }

  public collect(peer: Peer, uid: number) {
    const droppedItem = this.data.dropped?.items.find((i) => i.uid === uid);
    if (!droppedItem) return;
    const item = this.base.items.metadata.items.find(
      (i) => i.id === droppedItem.id
    );
    if ((item?.id ?? 0) <= 1 ) return;

    const itemInInv = peer.data.inventory.items.find(
      (i) => i.id === droppedItem.id
    );

    if (
      (!itemInInv &&
        peer.data.inventory.items.length >= peer.data.inventory.max) ||
      (itemInInv && itemInInv.amount >= 200)
    )
      return;

    peer.every(
      (p) =>
        p.data?.world === peer.data?.world &&
        p.data?.world !== "EXIT" &&
        p.send(
          TankPacket.from({
            type:        TankTypes.ITEM_CHANGE_OBJECT,
            netID:       peer.data?.netID,
            targetNetID: -1,
            info:        uid
          })
        )
    );

    if (itemInInv) {
      if (droppedItem.amount + itemInInv.amount > 200) {
        const extra = droppedItem.amount + itemInInv.amount - 200;
        peer.send(
          Variant.from(
            "OnConsoleMessage",
            `Collected \`w${200 - itemInInv.amount} ${item?.name}`
          )
        );
        itemInInv.amount = 200;

        this.drop(peer, droppedItem.x, droppedItem.y, droppedItem.id, extra, {
          noSimilar: true,
          tree:      true
        });
      } else {
        if (droppedItem.id !== 112) {
          itemInInv.amount += droppedItem.amount;
          peer.send(
            Variant.from(
              "OnConsoleMessage",
              `Collected \`w${droppedItem.amount} ${item?.name}`
            )
          );
        } else {
          peer.data.gems += droppedItem.amount;
        }
      }
    } else {
      if (droppedItem.id !== 112) {
        peer.addItemInven(droppedItem.id, droppedItem.amount, true);
        peer.send(
          Variant.from(
            "OnConsoleMessage",
            `Collected \`w${droppedItem.amount} ${item?.name}`
          )
        );
      } else {
        peer.data.gems += droppedItem.amount;
      }
    }

    this.data.dropped!.items = this.data.dropped!.items.filter(
      (i) => i.uid !== droppedItem.uid
    );

    peer.saveToCache();
    this.saveToCache();
  }

  public harvest(peer: Peer, block: Block) {
    if (block.tree && Date.now() >= block.tree.fullyGrownAt) {
      this.drop(
        peer,
        block.x * 32 + Math.floor(Math.random() * 16),
        block.y * 32 + Math.floor(Math.random() * 16),
        block.tree.fruit,
        block.tree.fruitCount,
        { tree: true }
      );

      block.tree = undefined;
      block.fg = 0x0;

      peer.every(
        (p) =>
          p.data?.world === peer.data?.world &&
          p.data?.world !== "EXIT" &&
          p.send(
            TankPacket.from({
              type:        TankTypes.SEND_TILE_TREE_STATE,
              netID:       peer.data?.netID,
              targetNetID: -1,
              xPunch:      block.x,
              yPunch:      block.y
            })
          )
      );

      return true;
    }
    return false;
  }
}
