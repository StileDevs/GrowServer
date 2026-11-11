import { Packet, PacketKind, TextPacket } from "growtopia.wasm";
import { PACKET_TYPE, TANK_PACKET_TYPE } from "../../constants";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { logger } from "../../utils/logger";
import { Collection } from "../../utils/collection";
import { clearMagplantRemote, collectMagplantDrop } from "./magplant";
import { PlayerDB } from "../../database/services/player-db";
import { GameUpdatePacket } from "../packets/game-packet";
import { int32, Variant } from "../packets/variants";
import { getItem } from "../item/item-utils";
import type { Player } from "../player";
import { serverManager } from "../server/server-manager";
import { tileFrom } from "./tiles";
import { upgradeXenonite } from "./tiles/xenonite-tile";
import { isAntigravityActive } from "./tiles/antigravity-tile";
import { DEFAULT_MUSIC_BPM, ActionTypes, CLIENT_UNAMPLIFIED_MUSIC_TYPE, ITEM_ID, JAMMERS, MUSIC_BLOCKS, LockPermission, SIGNAL_JAMMER, TileFlags, WEATHER_CLEAR, WORLD_DATA_VERSION } from "./constants";
import type { DroppedItem, TileData, WorldData, XenoniteSettings } from "./types";

export interface DropOptions {
  /** Explicit collection provenance; animation flags do not authorize collection. */
  origin?: "block" | "harvest";
  /** Drop without attributing it to a player (e.g. from a broken block). */
  tree?: boolean;
  /** Never merge into an existing stack on the same tile. */
  noSimilar?: boolean;
}

/** A music block currently playing in a world. */
interface MusicSource {
  file: string;
  /** Block position, in tiles. */
  x: number;
  y: number;
  /** Audible radius in pixels when no amplifier is next to it. */
  radius: number;
  amplified: boolean;
  /** The client plays this block family by itself, amplifier included. */
  native: boolean;
  /** Identifies the block and its tune, used to remember relayed players. */
  key: string;
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
  /** Cached Xenonite masks, `undefined` when they must be recomputed. */
  private xenoniteCache: XenoniteSettings | null | undefined;

  /** Powers a Xenonite Crystal takes away in this world, if one is placed. */
  public xenoniteSettings(): XenoniteSettings | undefined {
    if (this.xenoniteCache === undefined) {
      const crystal = this.data.blocks.find((block) => getItem(block.fg)?.type === ActionTypes.XENONITE);
      if (crystal?.xenonite) {
        // world files saved before the official force/block layout
        crystal.xenonite = upgradeXenonite(crystal.xenonite as XenoniteSettings & { mods?: number; powerups?: number });
      }
      this.xenoniteCache = crystal?.xenonite ?? null;
    }
    return this.xenoniteCache ?? undefined;
  }

  /** Drops the cached Xenonite masks after the crystal changed. */
  public invalidateXenonite(): void {
    this.xenoniteCache = undefined;
  }

  /** Cached music sources, `undefined` when they must be recomputed. */
  private musicCache: MusicSource[] | undefined;
  /** Audio file currently streamed to each player, keyed by player id. */
  private musicStreams: Collection<number, string> = new Collection();
  /** Players whose own tile audio was replaced by the server relay, keyed by player id. */
  private musicRelayed: Collection<number, string> = new Collection();

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

  /** Animates an item from the player's avatar into the target tile. */
  public sendItemEffectToTile(itemId: number, user: Player, tile: TileData): void {
    this.broadcastVariant(Variant.from(
      "OnItemEffect", 4, int32(itemId), int32(1), [0, 0],
      [tile.x * 32 + 16, tile.y * 32 + 16], int32(user.netID),
    ));
  }

  /** Tile at a block position, or undefined when out of bounds. */
  public getTileAt(x: number, y: number): TileData | undefined {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return undefined;
    return this.data.blocks[x + y * this.width];
  }

  /**
   * Checks if a tile at the given block coordinates is solid (cannot drop, walk, or fish through).
   */
  public isSolid(x: number, y: number): boolean {
    const tile = this.getTileAt(x, y);
    if (!tile) return true; // Out of bounds is solid
    if (!tile.fg) return false;

    const item = getItem(tile.fg);
    if (!item) return false;

    const collision = item.collisionType ?? 0;
    // 1: Solid block (Dirt, Rock, Bedrock, etc.)
    if (collision === 1) return true;
    // 3: Gate/Portcullis; solid unless open
    if (collision === 3 && (tile.flags & TileFlags.OPEN) === 0) return true;
    // 4: Trapdoor / IF_OFF; solid unless open
    if (collision === 4 && (tile.flags & TileFlags.OPEN) === 0) return true;

    return false;
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

  /** Re-sends every avatar's name so world-role colors update immediately. */
  public refreshNameColors(): void {
    for (const player of this.players) {
      this.broadcastVariant(Variant.from({ netID: player.netID }, "OnNameChanged", player.formattedName));
    }
  }

  /** Drops the cached music source after a tile or amplifier change. */
  public invalidateMusic(): void {
    this.musicCache = undefined;
  }

  /**
   * Every open music block with an audio file, in block order. Native boombox
   * style blocks (types 12 / 22 / 23) are played and amplified by the client
   * itself; the animated type 122 blocks only play positionally and never
   * spread, so the server relays those once amplified.
   */
  private musicSources(): MusicSource[] {
    if (this.musicCache !== undefined) return this.musicCache;

    const sources: MusicSource[] = [];
    for (const block of this.data.blocks) {
      if ((block.flags & TileFlags.OPEN) === 0) continue;
      // silenced blocks keep their ability but must not be heard
      if ((block.flags & TileFlags.SILENCED) !== 0) continue;
      if (!MUSIC_BLOCKS.has(block.fg)) continue;

      const item = getItem(block.fg);
      const file = item?.extraFile;
      if (!file?.startsWith("audio/")) continue;

      const amplifier = this.getTileAt(block.x + 1, block.y);
      const amplified = amplifier !== undefined && (amplifier.flags & TileFlags.OPEN) !== 0 && getItem(amplifier.fg)?.id === ITEM_ID.MUSIC_AMPLIFIER;
      sources.push({
        file,
        x: block.x,
        y: block.y,
        radius: Math.max(item?.audioVolume ?? 0, 384),
        amplified,
        native: item?.type !== CLIENT_UNAMPLIFIED_MUSIC_TYPE,
        key: `${block.x},${block.y},${file}`,
      });
    }

    this.musicCache = sources;
    return sources;
  }

  /**
   * Reconciles the music stream of every player with the world's sources.
   *
   * Native blocks are left to the client entirely. For the animated blocks,
   * an amplified tune is relayed to the whole world; without an amplifier the
   * client's own positional playback is kept unless it was already replaced by
   * a relay, in which case the block's radius is streamed to cover it. The
   * client's music stream is a single channel, so an amplified block wins over
   * a radius one and the first amplified block wins over later ones.
   */
  public syncMusic(): void {
    const sources = this.musicSources().filter((source) => !source.native);

    for (const player of this.players) {
      let wanted: string | undefined;
      let key: string | undefined;
      for (const source of sources) {
        if (source.amplified) {
          wanted = source.file;
          key = source.key;
          break;
        }
        if (this.musicRelayed.get(player.playerId) === source.key) {
          const dx = player.state.x - (source.x * 32 + 16);
          const dy = player.state.y - (source.y * 32 + 16);
          if (Math.hypot(dx, dy) <= source.radius) {
            wanted = source.file;
            key = source.key;
          }
        }
      }

      const current = this.musicStreams.get(player.playerId);
      if (wanted === current) continue;

      if (wanted === undefined) {
        this.musicStreams.delete(player.playerId);
        player.actions.sendPlayMusic("");
        continue;
      }

      this.musicStreams.set(player.playerId, wanted);
      if (key !== undefined) this.musicRelayed.set(player.playerId, key);
      player.actions.sendPlayMusic(wanted);
    }
  }

  /** Stops the stream of a player that leaves the world. */
  public stopMusicFor(player: Player): void {
    this.musicRelayed.delete(player.playerId);
    if (!this.musicStreams.delete(player.playerId)) return;
    player.actions.sendPlayMusic("");
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

    // a placed crystal takes powers away from everyone, like the official server
    if (this.xenoniteSettings()) player.playMods.add("xenonite");

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
    // retail only announces entrances to a small world, and never an invisible player
    const joinMessage = `\`5<${player.formattedName}\`\` entered, \`w${othersCount}\`\` others here>\`\``;
    const announceJoin = othersCount >= 1 && othersCount <= 14 && !player.state.isGhost;

    for (const other of others) {
      other.variants.sendOnSpawn(player.spawnOptions(false));
      other.variants.sendClothes(player.netID, player.inventory.clothes, player.effectiveSkinColor);
      other.sendBuffer(other.variants.buildCharacterState(player.netID, player.characterStats, player.state.characterState, player.punchId));
      if (announceJoin) {
        other.variants.sendOnConsoleMessage(joinMessage);
        other.variants.sendOnTalkBubble(player.netID, joinMessage, true);
      }
      other.actions.sendPlaySfx("audio/door_open.wav");

      player.variants.sendOnSpawn(other.spawnOptions(false));
      player.variants.sendClothes(other.netID, other.inventory.clothes, other.effectiveSkinColor);
      player.sendBuffer(player.variants.buildCharacterState(other.netID, other.characterStats, other.state.characterState, other.punchId));
    }

    // every avatar is spawned now, so the tile changes have a valid actor
    this.syncMusicTiles(player);
    this.musicStreams.delete(player.playerId);
    this.musicRelayed.delete(player.playerId);
    this.syncMusic();

    logger.debug({ player: player.tankIDName, world: this.name, players: othersCount + 1 }, "player entered world");
  }

  /**
   * Removes a player from this world and tells the others.
   */
  public leave(player: Player): void {
    if (player.world !== this) return;
    clearMagplantRemote(player);

    const leftNetId = player.netID;
    // captured before the world is detached: the name color depends on it
    const leftName = player.formattedName;
    this.stopMusicFor(player);
    player.world = null;
    player.netID = 0;
    // Geiger targets belong to a world; a new world starts a new hunt
    player.geiger = null;
    // the crystal's powers only apply inside the world
    player.playMods.remove("xenonite");
    player.state.world.name = "";
    player.lastCheckpoint = null;
    player.actions.sendPlaySfx("audio/door_shut.wav");

    const remaining = this.players.length;
    const leaveMessage = `\`5<${leftName}\`\` left, \`w${remaining}\`\` others here>\`\``;

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
  public drop(player: Player, x: number, y: number, id: number, amount: number, { tree, noSimilar, origin }: DropOptions = {}): void {
    if (origin === "block" || origin === "harvest") amount = collectMagplantDrop(this, id, amount, { x, y });
    if (amount <= 0) return;
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

    const isFish = getItem(id)?.type === ActionTypes.PETFISH;
    const forceNoSimilar = noSimilar || isFish;

    const similarDrops = forceNoSimilar
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
   * Removes a dropped item from the world and notifies clients to despawn it.
   */
  public removeDrop(uid: number, picker?: Player): boolean {
    const droppedItem = this.data.dropped.items.find((item) => item.uid === uid);
    if (!droppedItem) return false;

    this.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
        netID: picker?.netID ?? -1,
        targetNetID: -1,
        itemID: uid,
      }).parse()!,
    );

    this.data.dropped.items = this.data.dropped.items.filter((item) => item.uid !== uid);
    this.markDirty();
    return true;
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
    const isFish = itemMeta?.type === ActionTypes.PETFISH;

    if (!isGems && ((owned === 0 && player.inventory.isFull) || owned >= 200)) return;
    if (isFish && owned > 0) return;

    this.removeDrop(uid, player);

    // the client adds the collected amount to its backpack on its own when it
    // receives the collect packet above, so the items are added silently here
    if (isGems) {
      player.addGems(droppedItem.amount);
    } else if (isFish) {
      player.addItemInven(droppedItem.id, droppedItem.amount, false);
      player.variants.sendOnConsoleMessage(`Collected \`w${droppedItem.amount} lb. ${itemMeta?.name}\`\`.`);
    } else if (owned + droppedItem.amount > 200) {
      const extra = owned + droppedItem.amount - 200;
      player.variants.sendOnConsoleMessage(`Collected \`w${200 - owned} ${itemMeta?.name}\`\`.`);
      player.addItemInven(droppedItem.id, 200 - owned, false);
      this.drop(player, droppedItem.x, droppedItem.y, droppedItem.id, extra, { noSimilar: true, tree: true });
    } else {
      player.addItemInven(droppedItem.id, droppedItem.amount, false);
      player.variants.sendOnConsoleMessage(`Collected \`w${droppedItem.amount} ${itemMeta?.name}\`\`.`);
    }
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
