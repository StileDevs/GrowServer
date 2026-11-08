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
import { isAntigravityActive } from "./tiles/antigravity-tile";
import { DEFAULT_MUSIC_BPM, ActionTypes, ITEM_ID, JAMMERS, LockPermission, SIGNAL_JAMMER, TileFlags, WEATHER_CLEAR, WORLD_DATA_VERSION } from "./constants";
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

  /**
   * Why a player may not enter this world, or undefined when they may. The
   * world lock's minimum level does not apply to the owner, admins or staff.
   */
  public entryDenial(player: Player): string | undefined {
    const index = this.data.worldLockIndex;
    const lock = index === undefined ? undefined : this.getTileByIndex(index);
    const minLevel = lock?.worldLockData?.minLevel ?? 1;
    if (minLevel <= 1 || player.level >= minLevel || player.isModerator) return undefined;
    if (lock?.lock && (lock.lock.ownerPlayerId === player.playerId || lock.lock.adminIds.includes(player.playerId))) return undefined;
    return `\`4You need to be level \`w${minLevel}\`4 to enter \`w${this.name}\`4.\`\``;
  }

  /** Tempo of the world's sheet music, from the world lock (100 when unlocked). */
  public get musicBpm(): number {
    const index = this.data.worldLockIndex;
    const lock = index === undefined ? undefined : this.getTileByIndex(index);
    return lock?.worldLockData?.bpm ?? DEFAULT_MUSIC_BPM;
  }

  /** Plays a particle effect (SEND_PARTICLE_EFFECT) at a pixel position for everyone here. */
  public sendParticleEffect(effectId: number, x: number, y: number, delayMs = 0): void {
    this.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.SEND_PARTICLE_EFFECT,
        netID: effectId,
        speedY: effectId,
        posX: x,
        posY: y,
        float_var: delayMs,
      }).parse()!,
    );
  }

  /**
   * Shows an item being used by `user` on `target` (ITEM_EFFECT): the eat /
   * throw animation of consumables.
   */
  public sendItemEffect(itemId: number, user: Player, target: Player): void {
    this.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.ITEM_EFFECT,
        buildRange: 5,
        targetNetID: target.netID,
        tileX: itemId,
        tileY: user.netID,
        posX: user.state.x + 10,
        posY: user.state.y + 16,
      }).parse()!,
    );
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

  /** Modifier labels of the jammers that are switched on in this world. */
  public get worldMods(): string[] {
    const mods = new Set<string>();
    for (const block of this.data.blocks) {
      if ((block.flags & TileFlags.OPEN) === 0) continue;
      const label = JAMMERS.get(block.fg);
      if (label) mods.add(label);
    }
    if (isAntigravityActive(this)) mods.add("ANTIGRAVITY");
    return [...mods];
  }

  /** Whether a switched on signal jammer hides this world from world lists. */
  public get signalJammed(): boolean {
    return this.data.blocks.some((block) => block.fg === SIGNAL_JAMMER && (block.flags & TileFlags.OPEN) !== 0);
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
  public serialize(viewer?: Player): Buffer {
    const name = this.name;
    const header = new ExtendBuffer(0);
    header.writeU16(WORLD_DATA_VERSION);
    header.writeU32(WORLD_DATA_VERSION > 0 ? 0x40 : 0);
    header.writeString(name);
    header.writeU32(this.width);
    header.writeU32(this.height);
    header.writeU32(this.width * this.height);
    header.writeBytes(Buffer.alloc(5));

    const tiles = new ExtendBuffer(0);
    for (const block of this.data.blocks) {
      tiles.writeBytes(tileFrom(this, block, undefined, undefined, viewer).parse().data);
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

    // modern worlds end with the weather trailer: base weather, an unknown
    // field, the current weather and six reserved bytes
    if (WORLD_DATA_VERSION >= 0x19) {
      tail.writeU16(this.data.weather.id);
      tail.writeU16(0);
      tail.writeU16(this.data.weather.id);
      tail.writeBytes(Buffer.alloc(6));
    } else if (WORLD_DATA_VERSION > 0) {
      tail.writeU16(this.data.weather.id);
      tail.writeU16(this.data.weather.id === WEATHER_CLEAR ? 0 : 1);
      tail.writeU32(0);
      tail.writeU32(0);
    }

    return Buffer.concat([header.toBuffer(), tiles.toBuffer(), tail.toBuffer()]);
  }

  /**
   * Re-creates every sheet music tile for one player.
   *
   * The client decides whether a note is invisible when it creates the tile,
   * not while it streams the map, so a fresh world load leaves the existing
   * notes drawn. Replaying a block change (clear, then place) makes the client
   * recreate each tile after it already knows the world lock's settings.
   */
  private syncMusicTiles(player: Player): void {
    const lockIndex = this.data.worldLockIndex;
    const lockTile = lockIndex === undefined ? undefined : this.getTileByIndex(lockIndex);
    const lockData = lockTile?.worldLockData;
    if (!lockTile || !lockData || (!lockData.invisMusicBlocks && !lockData.customMusicBlocksDisabled)) return;

    player.send(
      new Packet(
        GameUpdatePacket.create({
          type: TANK_PACKET_TYPE.SEND_TILE_UPDATE_DATA,
          tileX: lockTile.x,
          tileY: lockTile.y,
          extraData: Array.from(tileFrom(this, lockTile, undefined, undefined, player).parse().data),
        }).parse()!,
        PacketKind.Reliable,
      ),
    );

    // a tile change placed by the reader itself would make the client take an
    // item out of the backpack, so borrow another avatar (or the lock owner)
    const actor = this.players.find((other) => other !== player) ?? this.players[0];

    for (const block of this.data.blocks) {
      if (getItem(block.fg)?.type !== ActionTypes.SHEET_MUSIC) continue;

      // clearing first forces the client to build the tile again
      player.send(
        new Packet(
          GameUpdatePacket.create({
            type: TANK_PACKET_TYPE.TILE_CHANGE_REQUEST,
            netID: actor?.netID ?? 0,
            itemID: 0,
            tileX: block.x,
            tileY: block.y,
          }).parse()!,
          PacketKind.Reliable,
        ),
      );
      player.send(
        new Packet(
          GameUpdatePacket.create({
            type: TANK_PACKET_TYPE.TILE_CHANGE_REQUEST,
            netID: actor?.netID ?? 0,
            itemID: block.fg,
            tileX: block.x,
            tileY: block.y,
          }).parse()!,
          PacketKind.Reliable,
        ),
      );
    }
  }

  /**
   * Audio file of the first music block playing with a switched-on Music
   * Amplifier on its right, if any.
   */
  public findAmplifiedMusic(): string | undefined {
    for (const block of this.data.blocks) {
      if (block.fg !== ITEM_ID.MUSIC_AMPLIFIER || (block.flags & TileFlags.OPEN) === 0) continue;

      const left = this.getTileAt(block.x - 1, block.y);
      if (!left || (left.flags & TileFlags.OPEN) === 0) continue;

      const file = getItem(left.fg)?.extraFile;
      if (file?.startsWith("audio/")) return file;
    }
    return undefined;
  }

  /** Plays an amplified music block to everyone in the world. */
  public playAmplifiedMusic(file: string): void {
    for (const player of this.players) player.actions.sendPlayMusic(file);
  }

  /** Stops the amplified music stream. */
  public stopAmplifiedMusic(): void {
    for (const player of this.players) player.actions.sendPlayMusic("");
  }

  /**
   * Re-asserts every switched-on Music Amplifier and the music block on its
   * left, after the world map was parsed: the client builds the sound when it
   * reads the music block, which happens before the amplifier tile is known.
   */
  private syncMusicAmplifiers(player: Player): void {
    for (const block of this.data.blocks) {
      if (block.fg !== ITEM_ID.MUSIC_AMPLIFIER || (block.flags & TileFlags.OPEN) === 0) continue;

      const left = this.getTileAt(block.x - 1, block.y);
      if (!left || (left.flags & TileFlags.OPEN) === 0) continue;
      if (!getItem(left.fg)?.extraFile?.startsWith("audio/")) continue;

      for (const tile of [left, block]) {
        player.send(
          new Packet(
            GameUpdatePacket.create({
              type: TANK_PACKET_TYPE.SEND_TILE_UPDATE_DATA,
              tileX: tile.x,
              tileY: tile.y,
              extraData: Array.from(tileFrom(this, tile, undefined, undefined, player).parse().data),
            }).parse()!,
            PacketKind.Reliable,
          ),
        );
      }
    }
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
          extraData: Array.from(this.serialize(player)),
        }).parse()!,
        PacketKind.Reliable,
      ),
    );

    player.variants.sendOnSetCurrentWeather(this.data.weather.id);
    player.variants.sendOnEmoticonDataChanged();
    player.variants.sendOnSpawn(player.spawnOptions(true));
    player.variants.sendOnSetPos(player.netID, player.state.x, player.state.y);
    player.variants.sendClothes(player.netID, player.inventory.clothes, player.effectiveSkinColor);
    player.sendBuffer(player.variants.buildCharacterState(player.netID, player.characterStats, player.state.characterState, player.punchId));
    // world modifiers shown in brackets, like the real game's "[ANTIGRAVITY]"
    const mods = this.worldMods.map((mod) => ` \`0[\`2${mod}\`\`\`0]\`\``).join("");
    player.variants.sendOnConsoleMessage(`World \`w${this.name}\`\`${mods} entered.  There are \`w${this.players.length - 1}\`\` other people here, \`w${serverManager.getTotalPlayersCount()}\`\` online.`);

    const ownerName = await this.getOwnerName();
    if (ownerName) {
      player.variants.sendOnConsoleMessage(`\`p[\`0${this.name} \`oWorld Locked by ${ownerName}\`#]`);
    }

    const others = this.players.filter((other) => other !== player);
    const othersCount = others.length;
    const joinMessage = `\`5<${player.displayName}\`\` joined, \`w${othersCount}\`\` others here\`5>\`\``;

    for (const other of others) {
      other.variants.sendOnSpawn(player.spawnOptions(false));
      other.variants.sendClothes(player.netID, player.inventory.clothes, player.effectiveSkinColor);
      other.sendBuffer(other.variants.buildCharacterState(player.netID, player.characterStats, player.state.characterState, player.punchId));
      other.variants.sendOnConsoleMessage(joinMessage);
      other.variants.sendOnTalkBubble(player.netID, joinMessage, true);
      other.actions.sendPlaySfx("audio/door_open.wav");

      player.variants.sendOnSpawn(other.spawnOptions(false));
      player.variants.sendClothes(other.netID, other.inventory.clothes, other.effectiveSkinColor);
      player.sendBuffer(player.variants.buildCharacterState(other.netID, other.characterStats, other.state.characterState, other.punchId));
    }

    // every avatar is spawned now, so the tile changes have a valid actor
    this.syncMusicTiles(player);
    this.syncMusicAmplifiers(player);

    const amplified = this.findAmplifiedMusic();
    if (amplified) player.actions.sendPlayMusic(amplified);

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

    // the client adds the collected amount to its backpack on its own when it
    // receives the collect packet above, so the items are added silently here
    if (isGems) {
      player.addGems(droppedItem.amount);
    } else if (owned + droppedItem.amount > 200) {
      const extra = owned + droppedItem.amount - 200;
      player.variants.sendOnConsoleMessage(`Collected \`w${200 - owned} ${itemMeta?.name}\`\`.`);
      player.addItemInven(droppedItem.id, 200 - owned, false);
      this.drop(player, droppedItem.x, droppedItem.y, droppedItem.id, extra, { noSimilar: true, tree: true });
    } else {
      player.addItemInven(droppedItem.id, droppedItem.amount, false);
      player.variants.sendOnConsoleMessage(`Collected \`w${droppedItem.amount} ${itemMeta?.name}\`\`.`);
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

  /** Whether the player is on the world lock's access list. */
  public isWorldAdmin(playerId: number): boolean {
    if (this.data.worldLockIndex === undefined) return false;
    const worldLock = this.getTileByIndex(this.data.worldLockIndex);
    return worldLock?.lock?.adminIds.includes(playerId) ?? false;
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
