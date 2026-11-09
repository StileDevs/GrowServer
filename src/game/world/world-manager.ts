import { deflateSync, inflateSync } from "zlib";
import { Collection } from "../../utils/collection";
import { logger } from "../../utils/logger";
import { WorldDB } from "../../database/services/world-db";
import { generateDefaultWorld } from "./generation/default";
import { World } from "./world";
import type { WorldData } from "./types";

/** Delay between a world change and the disk write that persists it. */
const SAVE_DEBOUNCE_MS = 2000;

/** Magic bytes at the start of every world file. */
const WORLD_FILE_MAGIC = Buffer.from("GSWD", "ascii");
/** Current on-disk format: deflated JSON of `WorldData` after an 8-byte header. */
const WORLD_FILE_FORMAT_JSON = 1;
const WORLD_FILE_HEADER_SIZE = 8;

/**
 * Encodes world data into the on-disk format: `GSWD` magic, u32 format
 * version, then the deflated JSON payload.
 */
export function encodeWorldFile(data: WorldData): Buffer {
  const header = Buffer.alloc(WORLD_FILE_HEADER_SIZE);
  WORLD_FILE_MAGIC.copy(header, 0);
  header.writeUInt32LE(WORLD_FILE_FORMAT_JSON, 4);
  return Buffer.concat([header, deflateSync(Buffer.from(JSON.stringify(data), "utf8"))]);
}

/**
 * Decodes a world file written by `encodeWorldFile`. Throws on an unknown
 * magic or format version so callers can back the file up and regenerate.
 */
export function decodeWorldFile(buffer: Buffer): WorldData {
  if (buffer.length < WORLD_FILE_HEADER_SIZE || !buffer.subarray(0, 4).equals(WORLD_FILE_MAGIC)) {
    throw new Error("not a growserver world file");
  }
  const format = buffer.readUInt32LE(4);
  if (format !== WORLD_FILE_FORMAT_JSON) {
    throw new Error(`unsupported world file format ${format}`);
  }
  return JSON.parse(inflateSync(buffer.subarray(WORLD_FILE_HEADER_SIZE)).toString("utf8")) as WorldData;
}

/**
 * Owns every loaded world. Lookups go through three tiers: memory (active
 * worlds), disk (`data/worlds/<x>/<name>.bin`, see `encodeWorldFile`) and
 * finally procedural generation for worlds that never existed.
 */
export class WorldManager {
  private static instance: WorldManager;

  /** Loaded worlds keyed by upper-case name. */
  public worlds: Collection<string, World> = new Collection();

  private pendingSaves: Collection<string, ReturnType<typeof setTimeout>> = new Collection();
  private loading: Collection<string, Promise<World>> = new Collection();

  public static getInstance(): WorldManager {
    if (!WorldManager.instance) WorldManager.instance = new WorldManager();
    return WorldManager.instance;
  }

  /** Normalizes a world name the way the client expects it (upper-case). */
  public static normalizeName(name: string): string {
    return name.trim().toUpperCase();
  }

  /** Returns a loaded world without touching disk. */
  public getLoaded(name: string): World | undefined {
    return this.worlds.get(WorldManager.normalizeName(name));
  }

  /**
   * Returns the world, loading it from disk or generating it when needed.
   */
  public async get(name: string): Promise<World> {
    const worldName = WorldManager.normalizeName(name);

    const loaded = this.worlds.get(worldName);
    if (loaded) return loaded;

    const inFlight = this.loading.get(worldName);
    if (inFlight) return inFlight;

    const promise = this.load(worldName).finally(() => this.loading.delete(worldName));
    this.loading.set(worldName, promise);
    return promise;
  }

  private async load(worldName: string): Promise<World> {
    let data: WorldData | null = null;

    const binary = await WorldDB.readBinary(worldName);
    if (binary) {
      try {
        data = decodeWorldFile(binary);
        logger.debug({ world: worldName }, "world loaded from disk");
      } catch (err) {
        logger.error({ err, world: worldName }, "world binary is corrupted, regenerating");
        await WorldDB.backupBinary(worldName);
      }
    }

    if (!data) {
      data = generateDefaultWorld(worldName);
      logger.info({ world: worldName }, "generated new world");
      if (!(await WorldDB.exists(worldName))) {
        await WorldDB.create(worldName);
      }
    }

    const world = new World(data);
    this.worlds.set(worldName, world);
    if (!binary) this.markDirty(world);
    return world;
  }

  /**
   * Schedules a debounced save of the world to disk.
   */
  public markDirty(world: World): void {
    const existing = this.pendingSaves.get(world.name);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.pendingSaves.delete(world.name);
      void this.save(world);
    }, SAVE_DEBOUNCE_MS);
    this.pendingSaves.set(world.name, timer);
  }

  /**
   * Writes the world to disk immediately.
   */
  public async save(world: World): Promise<void> {
    try {
      await WorldDB.writeBinary(world.name, encodeWorldFile(world.data));
      if (!(await WorldDB.exists(world.name))) {
        await WorldDB.create(world.name);
      } else {
        await WorldDB.updateByName(world.name, {});
      }
    } catch (err) {
      logger.error({ err, world: world.name }, "failed to save world");
    }
  }

  /**
   * Flushes every pending save; used during shutdown.
   */
  public async saveAll(): Promise<void> {
    const names = [...this.pendingSaves.keys()];
    for (const timer of this.pendingSaves.values()) clearTimeout(timer);
    this.pendingSaves.clear();

    for (const name of names) {
      const world = this.worlds.get(name);
      if (world) await this.save(world);
    }
    if (names.length) logger.info({ count: names.length }, "saved pending worlds");
  }

  /**
   * Gives a loaded world a new name: the in-memory registry, the database
   * record and the world file all move. The new name must be free.
   */
  public async rename(world: World, newName: string): Promise<void> {
    const oldName = world.name;
    const target = WorldManager.normalizeName(newName);
    if (target === oldName) return;

    const pending = this.pendingSaves.get(oldName);
    if (pending) {
      clearTimeout(pending);
      this.pendingSaves.delete(oldName);
    }

    this.worlds.delete(oldName);
    world.data.name = target;
    this.worlds.set(target, world);
    for (const player of world.players) player.state.world.name = target;

    if (await WorldDB.getByName(oldName)) await WorldDB.updateByName(oldName, { name: target });
    else if (!(await WorldDB.exists(target))) await WorldDB.create(target);

    await WorldDB.writeBinary(target, encodeWorldFile(world.data));
    await WorldDB.deleteBinary(oldName);
    logger.info({ from: oldName, to: target }, "world renamed");
  }

  /**
   * Drops an empty world from memory after saving it.
   */
  public async unloadIfEmpty(world: World): Promise<void> {
    if (world.players.length > 0) return;
    const pending = this.pendingSaves.get(world.name);
    if (pending) {
      clearTimeout(pending);
      this.pendingSaves.delete(world.name);
    }
    await this.save(world);
    this.worlds.delete(world.name);
  }

  /** Worlds sorted by player count, most populated first. */
  public mostPopulated(limit: number): World[] {
    return this.worlds
      .toArray()
      .filter((world) => world.players.length > 0)
      .sort((a, b) => b.players.length - a.players.length)
      .slice(0, limit);
  }
}

export const worldManager = WorldManager.getInstance();
