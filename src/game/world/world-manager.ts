import { WorldDB } from "../../database/services/world-db";
import { Collection } from "../../utils/collection";
import { logger } from "../../utils/logger";
import { DefaultWorldGenerator } from "./generation/default";
import type { WorldGenerator } from "./generation/world-generator";
import { World } from "./world";

export interface WorldCreationOptions {
  width?: number | undefined;
  height?: number | undefined;
  generator?: WorldGenerator | undefined;
}

/**
 * Singleton service managing world lifecycles, memory caching (L1),
 * disk binary storage (L2), and procedural generation (L3).
 */
export class WorldManager {
  private static instance: WorldManager;

  /** In-memory L1 cache of active worlds keyed by uppercase world name */
  public worlds: Collection<string, World> = new Collection();

  private constructor() {}

  public static getInstance(): WorldManager {
    if (!WorldManager.instance) {
      WorldManager.instance = new WorldManager();
    }
    return WorldManager.instance;
  }

  /**
   * Retrieves an active world from memory cache.
   */
  public getWorld(name: string): World | undefined {
    return this.worlds.get(name.trim().toUpperCase());
  }

  /**
   * Checks if a world is currently loaded in memory.
   */
  public hasWorld(name: string): boolean {
    return this.worlds.has(name.trim().toUpperCase());
  }

  /**
   * Loads a world using multi-tier access:
   * 1. L1 (Memory Cache)
   * 2. L2 (Disk Binary via WorldDB)
   * 3. L3 (Procedural Generation)
   */
  public async getOrCreateWorld(name: string, options?: WorldCreationOptions): Promise<World> {
    const cleanName = name.trim().toUpperCase();

    // 1. L1 Memory Check
    const cachedWorld = this.worlds.get(cleanName);
    if (cachedWorld) {
      return cachedWorld;
    }

    // 2. L2 Disk Check
    const binaryData = await WorldDB.readBinary(cleanName);
    if (binaryData) {
      const world = new World({ name: cleanName });
      world.deserialize(binaryData);
      this.worlds.set(cleanName, world);
      logger.info({ world: cleanName }, "loaded world from disk binary cache");
      return world;
    }

    // 3. L3 Procedural Generation
    const width = options?.width ?? 100;
    const height = options?.height ?? 60;
    logger.info({ world: cleanName, width, height }, "generating new procedural world");
    const generator = options?.generator ?? new DefaultWorldGenerator(cleanName, width, height);
    const genResult = generator.generate();

    const world = new World({
      name: cleanName,
      width: genResult.width,
      height: genResult.height,
      weather: genResult.weather,
    });

    world.tiles.loadTiles(genResult.tiles);

    // Persist metadata to database if not exists
    const existsInDb = await WorldDB.exists(cleanName);
    if (!existsInDb) {
      await WorldDB.create(cleanName, world.version);
    }

    // Persist binary to disk
    const serialized = world.serialize();
    await WorldDB.writeBinary(cleanName, serialized);

    this.worlds.set(cleanName, world);
    logger.info({ world: cleanName }, "procedural world created and cached in memory");
    return world;
  }

  /**
   * Saves a world's current state to disk binary storage.
   */
  public async saveWorld(name: string): Promise<void> {
    const cleanName = name.trim().toUpperCase();
    const world = this.worlds.get(cleanName);
    if (!world) return;

    const binary = world.serialize();
    await WorldDB.writeBinary(cleanName, binary);
    logger.info({ world: cleanName }, "saved world binary to disk");
  }

  /**
   * Saves all active worlds to disk storage.
   */
  public async saveAll(): Promise<void> {
    if (this.worlds.size === 0) return;

    logger.info({ count: this.worlds.size }, "saving all active worlds to disk...");
    for (const world of this.worlds.values()) {
      try {
        const binary = world.serialize();
        await WorldDB.writeBinary(world.name, binary);
      } catch (err) {
        logger.error({ err, world: world.name }, "failed to save world during saveAll");
      }
    }
    logger.info("all active worlds successfully saved");
  }

  /**
   * Unloads a world from memory after saving its state to disk.
   */
  public async unloadWorld(name: string): Promise<boolean> {
    const cleanName = name.trim().toUpperCase();
    const world = this.worlds.get(cleanName);
    if (!world) return false;

    // Do not unload if players are still in the world
    if (world.playerCount > 0) {
      logger.warn({ world: cleanName, players: world.playerCount }, "cannot unload world with active players");
      return false;
    }

    await this.saveWorld(cleanName);
    this.worlds.delete(cleanName);
    logger.info({ world: cleanName }, "unloaded world from memory");
    return true;
  }
}

export const worldManager = WorldManager.getInstance();
