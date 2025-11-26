import { PeerData, TankPacket, TextPacket, Variant } from "growtopia.js";
import { TileData, WorldData } from "@growserver/types";
import { Base } from "./Base";
import {
  ActionTypes,
  LockPermission,
  PacketTypes,
  ROLE,
  TankTypes,
  TileCollisionTypes,
  TileFlags,
} from "@growserver/const";
import { Peer } from "./Peer";
// import { tileParse } from "../world/tiles";
import { Default } from "../world/generation/Default";
import { Tile } from "../world/Tile";
import { tileFrom } from "../world/tiles";
import { ItemDefinition, ItemsDatMeta } from "grow-items";

export class World {
  public data: WorldData;
  public worldName;

  constructor(
    private base: Base,
    worldName: string,
  ) {
    this.base = base;
    this.worldName = worldName;

    const data = this.base.cache.worlds.get(worldName);
    if (data) {
      this.data = data;
    } else
      this.data = {
        name:    "",
        width:   0,
        height:  0,
        blocks:  [],
        weather: { id: 41 },
        dropped: { items: [], uid: 0 },
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
        "delayMS|0",
      ),
    );
    const world = peer.currentWorld();
    if (world) {
      world.every((p) => {
        if (p.data.netID !== peer.data.netID) {
          p.send(
            Variant.from(
              "OnRemove",
              `netID|${peer.data?.netID}`,
              `pId|${peer.data?.userID}`,
            ),
            Variant.from(
              "OnConsoleMessage",
              `\`5<${peer.data.displayName}\`\` left, \`w${this.data.playerCount}\`\` others here\`5>\`\``,
            ),
            Variant.from(
              "OnTalkBubble",
              peer.data.netID,
              `\`5<${peer.data.displayName}\`\` left, \`w${this.data.playerCount}\`\` others here\`5>\`\``,
              0,
              1,
            ),
            TextPacket.from(
              PacketTypes.ACTION,
              "action|play_sfx",
              "file|audio/door_shut.wav",
              "delayMS|0",
            ),
          );
        }
      });
    }

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
      return `add_floater|${v.name}|${v.playerCount ?? 0}|0.5|3529161471\n`;
    else return "";
  })
  .join("\n")}
add_heading|Recently Visited Worlds<CR>|
${peer.data.lastVisitedWorlds
  ?.reverse()
  .map((v) => {
    const count = this.base.cache.worlds.get(v)?.playerCount || 0;
    return `add_floater|${v}|${count ?? 0}|0.5|3417414143\n`;
  })
  .join("\n")}
`,
        ),
        Variant.from(
          { delay: 500 },
          "OnConsoleMessage",
          `Where would you like to go? (\`w${this.base.getPlayersOnline()}\`\` online)`,
        ),
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
          blocks:      world.blocks ? JSON.parse(world.blocks.toString()) : [],
          // admins: [],
          playerCount: 0,
          jammers:     [],
          dropped:     world.dropped
            ? JSON.parse(world.dropped.toString())
            : { uid: 0, items: [] },
          // owner: world.owner ? JSON.parse(world.owner.toString()) : null,
          weather:        { id: world.weather_id || 41 },
          worldLockIndex: world.worldlock_index
            ? world.worldlock_index
            : undefined,
          // minLevel: world.minimum_level || 1,
        };
      } else {
        await this.generate(true);
      }
    } else this.data = this.base.cache.worlds.get(this.worldName) as WorldData;
  }

  /**
   * Emulate TileChangeReq
   *
   * if `overrideTile` is true, the target tile will be replaced.
   * else it will simulate TileChangeReq behaviour.
   * @param peer peer that initiate the place.
   * @param param2 See the function description.
   */
  public async place(
    peer: Peer,
    x: number,
    y: number,
    itemID: ItemDefinition,
    { overrideTile }: { overrideTile: boolean } = { overrideTile: false },
  ): Promise<boolean> {
    const targetTile = tileFrom(
      this.base,
      this,
      this.data.blocks[y * this.data.width + x],
    );

    if (itemID.type == ActionTypes.BACKGROUND) {
      return targetTile.onPlaceBackground(peer, itemID);
    } else if (targetTile.data.fg == 0) {
      return targetTile.onPlaceForeground(peer, itemID);
    } else {
      return targetTile.onItemPlace(peer, itemID);
    }
  }

  public async enter(peer: Peer, x: number, y: number) {
    await this.getData();

    if (typeof x !== "number") x = -1;
    if (typeof y !== "number") y = -1;

    // Validate world data
    if (!this.data || !this.data.blocks || this.data.blocks.length === 0) {
      console.error("World data is invalid or empty!");
      peer.send(
        Variant.from("OnConsoleMessage", "`4Error: World data is corrupted!"),
      );
      return;
    }

    const HEADER_LENGTH = this.worldName.length + 20;
    const buffer = Buffer.alloc(HEADER_LENGTH);
    const blockCount = this.data.height * this.data.width;

    // Verify block count matches
    if (this.data.blocks.length !== blockCount) {
      console.warn(
        `Block count mismatch! Expected: ${blockCount}, Got: ${this.data.blocks.length}`,
      );
    }

    // World data
    buffer.writeUint16LE(0x14); // Version/Type byte (20 in decimal)
    buffer.writeUint32LE(0x40, 2); // Flags or version
    buffer.writeUint16LE(this.worldName.length, 6);
    buffer.write(this.worldName, 8);
    buffer.writeUint32LE(this.data.width, 8 + this.worldName.length);
    buffer.writeUint32LE(this.data.height, 12 + this.worldName.length);
    buffer.writeUint32LE(blockCount, 16 + this.worldName.length);

    console.log(
      "Header bytes:",
      buffer.slice(0, Math.min(20, buffer.length)).toString("hex"),
    );

    // Tambahan 5 bytes, gatau ini apaan
    const unk1 = Buffer.alloc(5);
    // For 5.34, these bytes might matter - try setting to 0
    unk1.fill(0);

    // Block data
    const blockBytes: number[] = [];

    try {
      for (const block of this.data.blocks) {
        // const item = this.base.items.metadata.items.find(
        //   (i) => i.id === block.fg
        // );

        // const blockBuf = new Tile(this.base, this, block).serialize(item?.type as number);
        // const type = item?.type as number;
        // const blockBuf = await tileParse(type, this.base, this, block);
        const blockBuf = (await tileFrom(this.base, this, block).parse()).data;

        blockBuf.forEach((b) => blockBytes.push(b));
      }

      // Log first block for debugging
      if (blockBytes.length > 0) {
        console.log(
          "First block data (first 32 bytes):",
          Buffer.from(blockBytes.slice(0, 32)).toString("hex"),
        );
      }
    } catch (error) {
      console.error("Error serializing blocks:", error);
      throw error;
    }

    // Tambahan 12 bytes, gatau ini apaan
    const unk2 = Buffer.alloc(12);

    // Drop data
    const droppedItemsCount = this.data.dropped?.items?.length || 0;
    const droppedUid = this.data.dropped?.uid || 0;
    const dropData = Buffer.alloc(8 + droppedItemsCount * 16);
    dropData.writeUInt32LE(droppedItemsCount);
    dropData.writeUInt32LE(droppedUid, 4);

    let pos = 8;
    this.data.dropped?.items?.forEach((item) => {
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
    weatherData.writeUint16LE(this.data.weather.id); // weather id
    const weatherOnOff = this.data.weather.id === 41 ? 0x0 : 0x1; // 0 = off when clear, 1 = on otherwise
    weatherData.writeUint16LE(weatherOnOff, 2);
    weatherData.writeUint32LE(0x0, 4); // ??
    weatherData.writeUint32LE(0x0, 8); // ??

    const worldMap = Buffer.concat([
      buffer,
      Buffer.concat([unk1, Buffer.from(blockBytes)]),
      Buffer.concat([unk2, dropData, weatherData]),
    ]);

    const tank = TankPacket.from({
      type:  TankTypes.SEND_MAP_DATA,
      state: 8,
      data:  () => worldMap,
    });

    const mainDoor = this.data.blocks.find((block) => block.fg === 6);

    const xPos = (x < 0 ? mainDoor?.x || 0 : x) * 32;
    const yPos = (y < 0 ? mainDoor?.y || 0 : y) * 32;

    peer.send(tank);
    // Applly current weather on join
    peer.send(Variant.from("OnSetCurrentWeather", this.data.weather.id));
    peer.data.x = xPos;
    peer.data.y = yPos;
    peer.data.world = this.worldName;

    peer.send(
      Variant.from(
        { delay: -1 },
        "OnSpawn",
        `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.userID}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|\`w${peer.data.displayName}\`\`\ncountry|${peer.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\ntype|local`,
      ),

      Variant.from(
        {
          netID: peer.data?.netID,
        },
        "OnSetClothing",
        [
          peer.data.clothing.hair,
          peer.data.clothing.shirt,
          peer.data.clothing.pants,
        ],
        [
          peer.data.clothing.feet,
          peer.data.clothing.face,
          peer.data.clothing.hand,
        ],
        [
          peer.data.clothing.back,
          peer.data.clothing.mask,
          peer.data.clothing.necklace,
        ],
        0x8295c3ff,
        [peer.data.clothing.ances, 0.0, 0.0],
      ),
    );

    const ownerUserID = this.getOwnerUID();
    if (ownerUserID) {
      const ownerData = await this.base.database.players.getByUID(ownerUserID);
      peer.send(
        Variant.from(
          "OnConsoleMessage",
          `\`p[\`0${this.data.name} \`oWorld Locked by ${ownerData?.display_name}\`#]`,
        ),
      );
    }

    const world = peer.currentWorld();
    if (world) {
      world.every((p) => {
        if (p.data.netID !== peer.data.netID) {
          p.send(
            Variant.from(
              { delay: -1 },
              "OnSpawn",
              `spawn|avatar\nnetID|${peer.data?.netID}\nuserID|${peer.data?.userID}\ncolrect|0|0|20|30\nposXY|${peer.data?.x}|${peer.data?.y}\nname|\`w${peer.data.displayName}\`\`\ncountry|${peer.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`,
            ),
            Variant.from(
              {
                netID: peer.data?.netID,
              },
              "OnSetClothing",
              [
                peer.data.clothing.hair,
                peer.data.clothing.shirt,
                peer.data.clothing.pants,
              ],
              [
                peer.data.clothing.feet,
                peer.data.clothing.face,
                peer.data.clothing.hand,
              ],
              [
                peer.data.clothing.back,
                peer.data.clothing.mask,
                peer.data.clothing.necklace,
              ],
              0x8295c3ff,
              [peer.data.clothing.ances, 0.0, 0.0],
            ),
            Variant.from(
              "OnConsoleMessage",
              `\`5<${peer.data.displayName}\`\` joined, \`w${this.data.playerCount}\`\` others here\`5>\`\``,
            ),
            Variant.from(
              "OnTalkBubble",
              peer.data.netID,
              `\`5<${peer.data.displayName}\`\` joined, \`w${this.data.playerCount}\`\` others here\`5>\`\``,
              0,
              1,
            ),
            TextPacket.from(
              PacketTypes.ACTION,
              "action|play_sfx",
              "file|audio/door_open.wav",
              "delayMS|0",
            ),
          );

          peer.send(
            Variant.from(
              { delay: -1 },
              "OnSpawn",
              `spawn|avatar\nnetID|${p.data?.netID}\nuserID|${p.data?.userID}\ncolrect|0|0|20|30\nposXY|${p.data?.x}|${p.data?.y}\nname|\`w${p.data.displayName}\`\`\ncountry|${p.country}\ninvis|0\nmstate|0\nsmstate|0\nonlineID|\n`,
            ),
            Variant.from(
              {
                netID: p.data?.netID,
              },
              "OnSetClothing",
              [
                p.data.clothing.hair,
                p.data.clothing.shirt,
                p.data.clothing.pants,
              ],
              [
                p.data.clothing.feet,
                p.data.clothing.face,
                p.data.clothing.hand,
              ],
              [
                p.data.clothing.back,
                p.data.clothing.mask,
                p.data.clothing.necklace,
              ],
              0x8295c3ff,
              [p.data.clothing.ances, 0.0, 0.0],
            ),
          );
        }
      });
    }

    this.data.playerCount = this.data.playerCount
      ? this.data.playerCount + 1
      : 1;

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
    { tree, noSimilar }: { tree?: boolean; noSimilar?: boolean } = {},
  ) {
    const tank = TankPacket.from({
      type:        TankTypes.ITEM_CHANGE_OBJECT,
      netID:       -1,
      targetNetID: tree ? -1 : peer.data?.netID,
      state:       0,
      info:        id,
      xPos:        x,
      yPos:        y,
    });

    const position = Math.trunc(x / 32) + Math.trunc(y / 32) * this.data.width;
    const block = this.data.blocks[position];

    const similarDrops = noSimilar
      ? null
      : this.data.dropped?.items
        .filter(
          (i) =>
            i.id === id && block.x === i.block.x && block.y === i.block.y,
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
        block: { x: block.x, y: block.y },
      });

    const buffer = tank.parse() as Buffer;
    buffer.writeFloatLE(amount, 20);

    this.every((p) => {
      p.send(buffer);
    });

    this.saveToCache();
  }

  public collect(peer: Peer, uid: number) {
    const droppedItem = this.data.dropped?.items.find((i) => i.uid === uid);
    if (!droppedItem) return;
    const item = this.base.items.metadata.items.get(droppedItem.id.toString());
    if ((item?.id ?? 0) <= 1) return;

    const itemInInv = peer.data.inventory.items.find(
      (i) => i.id === droppedItem.id,
    );

    if (
      (!itemInInv &&
        peer.data.inventory.items.length >= peer.data.inventory.max) ||
      (itemInInv && itemInInv.amount >= 200)
    )
      return;

    const world = peer.currentWorld();
    if (world) {
      world.every((p) => {
        p.send(
          TankPacket.from({
            type:        TankTypes.ITEM_CHANGE_OBJECT,
            netID:       peer.data?.netID,
            targetNetID: -1,
            info:        uid,
          }),
        );
      });
    }

    if (itemInInv) {
      if (droppedItem.amount + itemInInv.amount > 200) {
        const extra = droppedItem.amount + itemInInv.amount - 200;
        peer.send(
          Variant.from(
            "OnConsoleMessage",
            `Collected \`w${200 - itemInInv.amount} ${item?.name}`,
          ),
        );
        itemInInv.amount = 200;

        this.drop(peer, droppedItem.x, droppedItem.y, droppedItem.id, extra, {
          noSimilar: true,
          tree:      true,
        });
      } else {
        if (droppedItem.id !== 112) {
          itemInInv.amount += droppedItem.amount;
          peer.send(
            Variant.from(
              "OnConsoleMessage",
              `Collected \`w${droppedItem.amount} ${item?.name}`,
            ),
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
            `Collected \`w${droppedItem.amount} ${item?.name}`,
          ),
        );
      } else {
        peer.data.gems += droppedItem.amount;
      }
    }

    this.data.dropped!.items = this.data.dropped!.items.filter(
      (i) => i.uid !== droppedItem.uid,
    );

    peer.saveToCache();
    this.saveToCache();
  }

  public async hasTilePermission(
    userID: number,
    tile: TileData,
    permissionType: LockPermission,
  ): Promise<boolean> {
    // a lock owns this tile
    const userData = await this.base.database.players.getByUID(userID);
    if (userData && userData.role == ROLE.DEVELOPER) return true;

    // the tile being asked is the lock itself. No one have permission except the owner
    if (tile.lock) {
      return userID == tile.lock.ownerUserID;
    } else if (tile.lockedBy) {
      const owningLock =
        this.data.blocks[
          tile.lockedBy.parentY! * this.data.width + tile.lockedBy.parentX!
        ];
      if (owningLock.lock) {
        if (owningLock.lock.ownerUserID == userID) {
          return true;
        }

        if (
          owningLock.lock.adminIDs &&
          owningLock.lock.adminIDs.includes(userID)
        ) {
          if (owningLock.lock.adminLimited) {
            return (
              !!(owningLock.lock.permission & permissionType) ||
              owningLock.lock.permission == permissionType
            );
          }
          return true;
        }
        // not admin?
        if (owningLock.flags & TileFlags.PUBLIC) {
          return (
            !!(owningLock.lock.permission & permissionType) ||
            owningLock.lock.permission == permissionType
          );
        }
      }
    } else if (this.data.worldLockIndex) {
      const worldLock = this.data.blocks[this.data.worldLockIndex];

      if (worldLock.flags & TileFlags.PUBLIC) return true;
      else if (
        worldLock.lock!.adminIDs &&
        worldLock.lock!.adminIDs.includes(userID)
      ) {
        return true;
      } else if (worldLock.lock!.ownerUserID == userID) {
        return true;
      }
    } else {
      // no locks and no owner
      return true;
    }

    return permissionType == LockPermission.NONE || false;
  }

  public async every(
    callbackfn: (peer: Peer, netID: number) => void,
  ): Promise<void> {
    if (this.data.playerCount == 0) {
      return;
    }
    this.base.cache.peers.forEach((p, k) => {
      const pp = new Peer(this.base, p.netID);
      if (pp.data.world == this.data.name) {
        callbackfn(pp, p.netID);
      }
    });
  }

  public getPeerByNetID(netID: number): Peer | undefined {
    let peer = undefined;
    this.every((p) => {
      if (p.data.netID == netID) {
        peer = p;
      }
    });

    return peer;
  }

  public getOwnerUID(): number | undefined {
    if (this.data.worldLockIndex) {
      const lock = this.data.blocks[this.data.worldLockIndex];
      if (lock.lock && lock.worldLockData) {
        return lock.lock.ownerUserID;
      }
    }
    return undefined;
  }

  // Helper functino to get lock owner user ID on a specific tile.
  public getTileOwnerUID(tile: TileData): number | undefined {
    if (tile.lockedBy) {
      const owningLock =
        this.data.blocks[
          tile.lockedBy.parentY! * this.data.width + tile.lockedBy.parentX!
        ];
      if (owningLock.lock) {
        return owningLock.lock.ownerUserID;
      }
    }
    // the tile being asked is the lock itself. No one have permission except the owner
    else if (tile.lock) {
      return tile.lock.ownerUserID;
    } else if (this.data.worldLockIndex) {
      const worldLock = this.data.blocks[this.data.worldLockIndex];
      return worldLock.lock?.ownerUserID;
    } else {
      // no locks and no owner
      return undefined;
    }
  }
}
