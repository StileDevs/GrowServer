import { Packet, PacketKind, TextPacket } from "growtopia.wasm";
import { PACKET_TYPE, TANK_PACKET_TYPE } from "../../constants";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { logger } from "../../utils/logger";
import { PlayerDB } from "../../database/services/player-db";
import { GameUpdatePacket } from "../packets/game-packet";
import { Variant } from "../packets/variants";
import { getItem } from "../item/item-utils";
import type { Player } from "../player";
import { serverManager } from "../server/server-manager";
import { tileFrom } from "./tiles";
import { ITEM_ID, LockPermission, TileFlags, WEATHER_CLEAR, WORLD_DATA_VERSION } from "./constants";
import type { DroppedItem, TileData, WorldData } from "./types";

export interface DropOptions {
  /** Drop without attributing it to a player (e.g. from a broken block). */
  tree?: boolean;
  /** Never merge into an existing stack on the same tile. */
  noSimilar?: boolean;
}

/**
 * A loaded world: its tiles, dropped items and the players inside it.
 * Persistence is handled by `WorldManager`; call `markDirty()` after changes.
 */
export class World {
  /** Next avatar net ID handed out to a player entering this world; 0 means "not in a world". */
  private nextNetId = 1;

  constructor(public data: WorldData) {}

  public get name(): string {
    return this.data.name;
  }

  public get width(): number {
    return this.data.width;
  }

  public get height(): number {
    return this.data.height;
  }

  /** Players currently inside this world, across every game server. */
  public get players(): Player[] {
    return serverManager.players.filter((player) => player.world === this);
  }

  /** The main door tile, if the world still has one. */
  public get mainDoor(): TileData | undefined {
    return this.data.blocks.find((block) => block.fg === ITEM_ID.MAIN_DOOR);
  }

  /** Tile at a block position, or undefined when out of bounds. */
  public getTileAt(x: number, y: number): TileData | undefined {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return undefined;
    return this.data.blocks[x + y * this.width];
  }

  /** Tile at a block index. */
  public getTileByIndex(index: number): TileData | undefined {
    return this.data.blocks[index];
  }

  /** Schedules this world to be saved. */
  public markDirty(): void {
    // lazy import to avoid a circular dependency at module load time
    void import("./world-manager").then(({ worldManager }) => worldManager.markDirty(this));
  }

  /** Sends a raw packet buffer to every player in the world. */
  public broadcast(buffer: Buffer, exceptPlayerId?: string): void {
    for (const player of this.players) {
      if (exceptPlayerId !== undefined && player.id === exceptPlayerId) continue;
      player.send(new Packet(buffer, PacketKind.Reliable));
    }
  }

  /** Sends a variant to every player in the world. */
  public broadcastVariant(variant: Variant, exceptPlayerId?: string): void {
    this.broadcast(variant.parse(), exceptPlayerId);
  }

  /** Plays a positioned sound at a player for everyone in the world. */
  public playPositioned(file: string, netID: number): void {
    this.broadcastVariant(Variant.from({ netID }, "OnPlayPositioned", file));
  }

  /** Plays a sound effect for everyone in the world. */
  public playSfx(file: string, delayMs = 0): void {
    this.broadcast(TextPacket.from(PACKET_TYPE.GAME_MESSAGE, "action|play_sfx", `file|${file}`, `delayMS|${delayMs}`).parse());
  }

  /**
   * Serializes the world into the SEND_MAP_DATA payload.
   */
  public serialize(): Buffer {
    const name = this.name;
    const header = new ExtendBuffer(0);
    header.writeU16(WORLD_DATA_VERSION);
    header.writeU32(0x40);
    header.writeString(name);
    header.writeU32(this.width);
    header.writeU32(this.height);
    header.writeU32(this.width * this.height);
    header.writeBytes(Buffer.alloc(5));

    const tiles = new ExtendBuffer(0);
    for (const block of this.data.blocks) {
      tiles.writeBytes(tileFrom(this, block).parse().data);
    }

    const tail = new ExtendBuffer(0);
    tail.writeBytes(Buffer.alloc(12));

    const dropped = this.data.dropped;
    tail.writeU32(dropped.items.length);
    tail.writeU32(dropped.uid);
    for (const item of dropped.items) {
      tail.writeU16(item.id);
      tail.writeFloat(item.x);
      tail.writeFloat(item.y);
      tail.writeU8(item.amount < 0 ? 0 : Math.min(item.amount, 255));
      tail.writeU8(0); // flags
      tail.writeU32(item.uid);
    }

    tail.writeU16(this.data.weather.id);
    tail.writeU16(this.data.weather.id === WEATHER_CLEAR ? 0 : 1);
    tail.writeU32(0);
    tail.writeU32(0);

    return Buffer.concat([header.toBuffer(), tiles.toBuffer(), tail.toBuffer()]);
  }

  /**
   * Puts a player into this world at a block position (defaults to the main
   * door, or the top-left corner when there is none) and announces it.
   */
  public async enter(player: Player, x?: number, y?: number): Promise<void> {
    const door = this.mainDoor;
    const tileX = x ?? door?.x ?? 0;
    const tileY = y ?? door?.y ?? 0;

    player.world = this;
    player.netID = this.nextNetId++;
    player.state.world.name = this.name;
    player.state.x = tileX * 32;
    player.state.y = tileY * 32;
    player.lastCheckpoint = null;

    player.send(
      new Packet(
        GameUpdatePacket.create({
          type: TANK_PACKET_TYPE.SEND_MAP_DATA,
          flags: 8,
          extraData: Array.from(this.serialize()),
        }).parse()!,
        PacketKind.Reliable,
      ),
    );

    player.variants.sendOnSetCurrentWeather(this.data.weather.id);
    player.variants.sendOnEmoticonDataChanged();
    player.variants.sendOnSpawn(player.spawnOptions(true));
    player.variants.sendOnSetPos(player.netID, player.state.x, player.state.y);
    player.variants.sendClothes(player.netID, player.inventory.clothes, player.skinColor);
    player.sendBuffer(player.variants.buildCharacterState(player.netID, player.state.characterState, player.punchId));
    player.variants.sendOnConsoleMessage(`World \`w${this.name}\`\` entered.  There are \`w${this.players.length - 1}\`\` other people here, \`w${serverManager.getTotalPlayersCount()}\`\` online.`);

    const ownerName = await this.getOwnerName();
    if (ownerName) {
      player.variants.sendOnConsoleMessage(`\`p[\`0${this.name} \`oWorld Locked by ${ownerName}\`#]`);
    }

    const others = this.players.filter((other) => other !== player);
    const othersCount = others.length;
    const joinMessage = `\`5<${player.displayName}\`\` joined, \`w${othersCount}\`\` others here\`5>\`\``;

    for (const other of others) {
      other.variants.sendOnSpawn(player.spawnOptions(false));
      other.variants.sendClothes(player.netID, player.inventory.clothes, player.skinColor);
      other.sendBuffer(other.variants.buildCharacterState(player.netID, player.state.characterState, player.punchId));
      other.variants.sendOnConsoleMessage(joinMessage);
      other.variants.sendOnTalkBubble(player.netID, joinMessage, true);
      other.actions.sendPlaySfx("audio/door_open.wav");

      player.variants.sendOnSpawn(other.spawnOptions(false));
      player.variants.sendClothes(other.netID, other.inventory.clothes, other.skinColor);
      player.sendBuffer(player.variants.buildCharacterState(other.netID, other.state.characterState, other.punchId));
    }

    logger.debug({ player: player.tankIDName, world: this.name, players: othersCount + 1 }, "player entered world");
  }

  /**
   * Removes a player from this world and tells the others.
   */
  public leave(player: Player): void {
    if (player.world !== this) return;

    const leftNetId = player.netID;
    player.world = null;
    player.netID = 0;
    player.state.world.name = "";
    player.lastCheckpoint = null;
    player.actions.sendPlaySfx("audio/door_shut.wav");

    const remaining = this.players.length;
    const leaveMessage = `\`5<${player.displayName}\`\` left, \`w${remaining}\`\` others here\`5>\`\``;

    for (const other of this.players) {
      other.variants.sendOnRemove(leftNetId, player.playerId);
      other.variants.sendOnConsoleMessage(leaveMessage);
      other.variants.sendOnTalkBubble(player.netID, leaveMessage, true);
      other.actions.sendPlaySfx("audio/door_shut.wav");
    }

    if (remaining === 0) {
      void import("./world-manager").then(({ worldManager }) => worldManager.unloadIfEmpty(this));
    }
  }

  /**
   * Drops an item into the world at pixel coordinates.
   */
  public drop(player: Player, x: number, y: number, id: number, amount: number, { tree, noSimilar }: DropOptions = {}): void {
    const tank = GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
      netID: -1,
      targetNetID: tree ? -1 : player.netID,
      itemID: id,
      posX: x,
      posY: y,
    });

    const blockX = Math.trunc(x / 32);
    const blockY = Math.trunc(y / 32);

    const similarDrops = noSimilar
      ? []
      : this.data.dropped.items.filter((item) => item.id === id && item.block.x === blockX && item.block.y === blockY).sort((a, b) => a.amount - b.amount);
    const similarDrop = similarDrops[0];

    if (similarDrop && similarDrop.amount < 200) {
      if (similarDrop.amount + amount > 200) {
        const extra = similarDrop.amount + amount - 200;
        amount = 0;
        similarDrop.amount = 200;
        this.drop(player, x, y, id, extra, { tree: true });
      }

      tank.data.netID = -3;
      tank.data.targetNetID = similarDrop.uid;
      tank.data.posX = similarDrop.x;
      tank.data.posY = similarDrop.y;

      amount += similarDrop.amount;
      similarDrop.amount = amount;
    } else {
      this.data.dropped.items.push({
        id,
        amount,
        x,
        y,
        uid: ++this.data.dropped.uid,
        block: { x: blockX, y: blockY },
      });
    }

    const buffer = tank.parse()!;
    // the dropped amount lives in the float_var slot (offset 4 + 16)
    buffer.writeFloatLE(amount, 20);

    this.broadcast(buffer);
    this.markDirty();
  }

  /**
   * Gives a dropped item to a player.
   */
  public collect(player: Player, uid: number): void {
    const droppedItem = this.data.dropped.items.find((item) => item.uid === uid);
    if (!droppedItem) return;

    const itemMeta = getItem(droppedItem.id);
    if ((itemMeta?.id ?? 0) <= 1) return;

    const owned = player.inventory.getAmount(droppedItem.id);
    const isGems = droppedItem.id === ITEM_ID.GEMS;

    if (!isGems && ((owned === 0 && player.inventory.isFull) || owned >= 200)) return;

    this.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
        netID: player.netID,
        targetNetID: -1,
        itemID: uid,
      }).parse()!,
    );

    if (isGems) {
      player.addGems(droppedItem.amount);
    } else if (owned + droppedItem.amount > 200) {
      const extra = owned + droppedItem.amount - 200;
      player.variants.sendOnConsoleMessage(`Collected \`w${200 - owned} ${itemMeta?.name}`);
      player.addItemInven(droppedItem.id, 200 - owned);
      this.drop(player, droppedItem.x, droppedItem.y, droppedItem.id, extra, { noSimilar: true, tree: true });
    } else {
      player.addItemInven(droppedItem.id, droppedItem.amount);
      player.variants.sendOnConsoleMessage(`Collected \`w${droppedItem.amount} ${itemMeta?.name}`);
    }

    this.data.dropped.items = this.data.dropped.items.filter((item) => item.uid !== droppedItem.uid);
    this.markDirty();
  }

  /** Removes every dropped item (used by /clearworld and similar). */
  public clearDrops(): void {
    this.data.dropped = { uid: 0, items: [] };
  }

  /** Dropped items on a tile. */
  public dropsAt(blockX: number, blockY: number): DroppedItem[] {
    return this.data.dropped.items.filter((item) => item.block.x === blockX && item.block.y === blockY);
  }

  /**
   * Whether a player may perform an action on a tile, honouring area locks,
   * the world lock and the developer role.
   */
  public async hasTilePermission(player: Player, tile: TileData, permissionType: LockPermission): Promise<boolean> {
    if (player.isDeveloper) return true;
    const playerId = player.playerId;

    if (tile.lock) {
      // the lock itself: only its owner may touch it
      return playerId === tile.lock.ownerPlayerId;
    }

    if (tile.lockedBy) {
      const owningLock = this.getTileAt(tile.lockedBy.parentX, tile.lockedBy.parentY);
      if (owningLock?.lock) {
        if (owningLock.lock.ownerPlayerId === playerId) return true;

        if (owningLock.lock.adminIds.includes(playerId)) {
          if (owningLock.lock.adminLimited) {
            return (owningLock.lock.permission & permissionType) !== 0 || owningLock.lock.permission === permissionType;
          }
          return true;
        }

        if (owningLock.flags & TileFlags.PUBLIC) {
          return (owningLock.lock.permission & permissionType) !== 0 || owningLock.lock.permission === permissionType;
        }
      }
      return permissionType === LockPermission.NONE;
    }

    if (this.data.worldLockIndex !== undefined) {
      const worldLock = this.getTileByIndex(this.data.worldLockIndex);
      if (worldLock?.lock) {
        if (worldLock.flags & TileFlags.PUBLIC) return true;
        if (worldLock.lock.adminIds.includes(playerId)) return true;
        if (worldLock.lock.ownerPlayerId === playerId) return true;
        return permissionType === LockPermission.NONE;
      }
    }

    // no locks and no owner
    return true;
  }

  /** Database id of the world lock owner, if the world is locked. */
  public getOwnerPlayerId(): number | undefined {
    if (this.data.worldLockIndex === undefined) return undefined;
    const lock = this.getTileByIndex(this.data.worldLockIndex);
    return lock?.lock && lock.worldLockData ? lock.lock.ownerPlayerId : undefined;
  }

  /** Display name of the world lock owner. */
  public async getOwnerName(): Promise<string | undefined> {
    const ownerId = this.getOwnerPlayerId();
    if (ownerId === undefined) return undefined;
    const owner = await PlayerDB.getById(ownerId);
    return owner?.display_name ?? owner?.name;
  }

  /** Database id of whoever owns a tile (through an area lock or the world lock). */
  public getTileOwnerPlayerId(tile: TileData): number | undefined {
    if (tile.lockedBy) {
      const owningLock = this.getTileAt(tile.lockedBy.parentX, tile.lockedBy.parentY);
      return owningLock?.lock?.ownerPlayerId;
    }
    if (tile.lock) return tile.lock.ownerPlayerId;
    return this.getOwnerPlayerId();
  }

  /** Display name of whoever owns a tile. */
  public async getTileOwnerName(tile: TileData): Promise<string | undefined> {
    const ownerId = this.getTileOwnerPlayerId(tile);
    if (ownerId === undefined) return undefined;
    const owner = await PlayerDB.getById(ownerId);
    return owner?.display_name ?? owner?.name;
  }
}
