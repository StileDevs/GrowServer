import type { PeerData, WorldData } from "@growserver/types";
import type { Database } from "@growserver/db";
import { Collection, ExtendBuffer } from "@growserver/utils";
import logger from "@growserver/logger";

interface CacheEntry<T> {
  data: T;
  lastAccessed: number;
  createdAt: number;
  dirty: boolean; // Track if data has been modified
  lastSaved: number;
}

interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
  idleTime?: number; // Time before considering cache idle (in milliseconds)
  autoSave?: boolean; // Enable auto-save to database
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

interface CacheManager<K, T> {
  cache: Collection<K, CacheEntry<T>>;
  stats: CacheStats;
}

export class StateManager {
  private players: CacheManager<number, PeerData>;
  private worlds: CacheManager<string, WorldData>;
  private cleanupTimer?: NodeJS.Timeout;
  private saveTimer?: NodeJS.Timeout;
  private database: Database;

  private readonly playerOptions: Required<CacheOptions>;
  private readonly worldOptions: Required<CacheOptions>;

  constructor(
    playerOptions: CacheOptions = {},
    worldOptions: CacheOptions = {},
    database: Database,
  ) {
    this.players = {
      cache: new Collection(),
      stats: { hits: 0, misses: 0, size: 0, evictions: 0 },
    };
    this.worlds = {
      cache: new Collection(),
      stats: { hits: 0, misses: 0, size: 0, evictions: 0 },
    };
    this.database = database;

    this.playerOptions = {
      maxSize:         playerOptions.maxSize ?? 1000,
      ttl:             playerOptions.ttl ?? 3600000, // 1 hour default
      cleanupInterval: playerOptions.cleanupInterval ?? 300000, // 5 minutes
      idleTime:        playerOptions.idleTime ?? 60000, // 1 minute default
      autoSave:        playerOptions.autoSave ?? true,
    };

    this.worldOptions = {
      maxSize:         worldOptions.maxSize ?? 500,
      ttl:             worldOptions.ttl ?? 1800000, // 30 minutes default
      cleanupInterval: worldOptions.cleanupInterval ?? 300000,
      idleTime:        worldOptions.idleTime ?? 60000, // 1 minute default
      autoSave:        worldOptions.autoSave ?? true,
    };

    this.startCleanup();
    if (this.database && (this.playerOptions.autoSave || this.worldOptions.autoSave)) {
      this.startAutoSave();
    }
  }

  /**
   * Get a player from cache
   */
  public getPlayer(netID: number): PeerData | undefined {
    const entry = this.players.cache.get(netID);

    if (!entry) {
      this.players.stats.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry, this.playerOptions.ttl)) {
      this.players.cache.delete(netID);
      this.players.stats.misses++;
      this.players.stats.evictions++;
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.players.stats.hits++;
    return entry.data;
  }

  /**
   * Get a player from cache, or load from database if not in cache
   */
  public async getPlayerFromDatabase(name: string): Promise<PeerData | undefined> {
    if (!this.database) {
      logger.warn("Cannot load player from database: database not configured");
      return undefined;
    }

    try {
      const playerData = await this.database.player.get(name);
      
      if (!playerData) {
        return undefined;
      }

      return playerData;
    } catch (error) {
      logger.error(`Failed to load player ${name} from database: ${error}`);
      return undefined;
    }
  }

  /**
   * Get a player from cache, or load from database and cache it if not found
   */
  public async getOrLoadPlayer(name: string): Promise<PeerData | undefined> {
    // First, try to find in cache by iterating through cached players
    let cachedPlayer: PeerData | undefined;
    for (const [, entry] of this.players.cache) {
      if (entry.data.name === name && !this.isExpired(entry, this.playerOptions.ttl)) {
        entry.lastAccessed = Date.now();
        this.players.stats.hits++;
        cachedPlayer = entry.data;
        break;
      }
    }

    if (cachedPlayer) {
      return cachedPlayer;
    }

    // Not in cache, load from database
    this.players.stats.misses++;
    const playerData = await this.getPlayerFromDatabase(name);

    if (playerData) {
      // Cache the loaded player data
      // Note: We need a netID to cache it. This assumes the playerData has a netID field
      // If not, you may need to adjust this logic based on your PeerData structure
      if (playerData.netID !== undefined) {
        this.setPlayer(playerData.netID, playerData);
      }
    }

    return playerData;
  }

  /**
   * Set a player in cache
   */
  public setPlayer(netID: number, data: PeerData): void {
    // Enforce max size by evicting least recently used
    if (
      this.players.cache.size >= this.playerOptions.maxSize &&
      !this.players.cache.has(netID)
    ) {
      this.evictLRU(this.players.cache, this.players.stats);
    }

    const entry: CacheEntry<PeerData> = {
      data,
      lastAccessed: Date.now(),
      createdAt:    Date.now(),
      dirty:        true,
      lastSaved:    Date.now(),
    };

    this.players.cache.set(netID, entry);
    this.players.stats.size = this.players.cache.size;
  }

  /**
   * Delete a player from cache
   */
  public deletePlayer(netID: number): boolean {
    const result = this.players.cache.delete(netID);
    this.players.stats.size = this.players.cache.size;
    return result;
  }

  /**
   * Check if player exists in cache
   */
  public hasPlayer(netID: number): boolean {
    const entry = this.players.cache.get(netID);
    if (!entry) return false;
    return !this.isExpired(entry, this.playerOptions.ttl);
  }

  /**
   * Get all players from cache
   */
  public getAllPlayers(): Collection<number, PeerData> {
    const players = new Collection<number, PeerData>();
    this.players.cache.forEach((entry, netID) => {
      if (!this.isExpired(entry, this.playerOptions.ttl)) {
        players.set(netID, entry.data);
      }
    });
    return players;
  }

  /**
   * Clear all players from cache
   */
  public clearPlayers(): void {
    this.players.cache.clear();
    this.players.stats.size = 0;
  }

  /**
   * Get a world from cache
   */
  public getWorld(worldName: string): WorldData | undefined {
    const entry = this.worlds.cache.get(worldName);

    if (!entry) {
      this.worlds.stats.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry, this.worldOptions.ttl)) {
      this.worlds.cache.delete(worldName);
      this.worlds.stats.misses++;
      this.worlds.stats.evictions++;
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.worlds.stats.hits++;
    return entry.data;
  }

  /**
   * Get a world from database
   * TODO: do this with player aswell -jad
   */
  public async getWorldFromDatabase(worldName: string): Promise<WorldData | undefined> {
    if (!this.database) {
      logger.warn("Cannot load world from database: database not configured");
      return undefined;
    }

    try {
      const worldDoc = await this.database.world.get(worldName);
      
      if (!worldDoc) {
        return undefined;
      }

      const tileMap = new ExtendBuffer(0);
      tileMap.data = worldDoc.tilesData;
      const worldData: WorldData = {
        name:       worldDoc.name,
        width:      worldDoc.width,
        height:     worldDoc.height,
        tileMap,
        tileExtras: worldDoc.extras.map(extra => ({
          id:   extra.id,
          x:    extra.x,
          y:    extra.y,
          data: extra.data ?? undefined
        })),
        dropped: {
          uidCount: worldDoc.droppedUidCounter,
          items:    worldDoc.droppedItems
        },
        weather: {
          id:       worldDoc.weather?.id ?? 0,
          heatWave: worldDoc.weather?.heatWave ?? { r: 0, g: 0, b: 0}
        },
        owner: {
          userId:    worldDoc.owner?.userId?.toString() ?? "",
          worldLock: { 
            x: worldDoc.owner?.worldLock?.x ?? 0, 
            y: worldDoc.owner?.worldLock?.y ?? 0 
          }
        }
      };

      return worldData;
    } catch (error) {
      logger.error(`Failed to load world ${worldName} from database: ${error}`);
      return undefined;
    }
  }

  /**
   * Get a world from cache, or load from database and cache it if not found
   */
  public async getOrLoadWorld(worldName: string): Promise<WorldData | undefined> {
    // First, try to get from cache
    const entry = this.worlds.cache.get(worldName);

    if (entry && !this.isExpired(entry, this.worldOptions.ttl)) {
      entry.lastAccessed = Date.now();
      this.worlds.stats.hits++;
      return entry.data;
    }

    // Not in cache or expired, load from database
    this.worlds.stats.misses++;
    const worldData = await this.getWorldFromDatabase(worldName);

    if (worldData) {
      // Cache the loaded world data
      this.setWorld(worldName, worldData);
    }

    return worldData;
  }

  /**
   * Set a world in cache
   */
  public setWorld(worldName: string, data: WorldData): void {
    // Enforce max size by evicting least recently used
    if (
      this.worlds.cache.size >= this.worldOptions.maxSize &&
      !this.worlds.cache.has(worldName)
    ) {
      this.evictLRU(this.worlds.cache, this.worlds.stats);
    }

    const entry: CacheEntry<WorldData> = {
      data,
      lastAccessed: Date.now(),
      createdAt:    Date.now(),
      dirty:        true,
      lastSaved:    Date.now(),
    };

    this.worlds.cache.set(worldName, entry);
    this.worlds.stats.size = this.worlds.cache.size;
  }

  /**
   * Delete a world from cache
   */
  public deleteWorld(worldName: string): boolean {
    const result = this.worlds.cache.delete(worldName);
    this.worlds.stats.size = this.worlds.cache.size;
    return result;
  }

  /**
   * Check if world exists in cache
   */
  public hasWorld(worldName: string): boolean {
    const entry = this.worlds.cache.get(worldName);
    if (!entry) return false;
    return !this.isExpired(entry, this.worldOptions.ttl);
  }

  /**
   * Get all worlds from cache
   */
  public getAllWorlds(): Collection<string, WorldData> {
    const worlds = new Collection<string, WorldData>();
    this.worlds.cache.forEach((entry, worldName) => {
      if (!this.isExpired(entry, this.worldOptions.ttl)) {
        worlds.set(worldName, entry.data);
      }
    });
    return worlds;
  }

  /**
   * Get all worlds as array of values
   */
  public getAllWorldsValues(): WorldData[] {
    const worlds: WorldData[] = [];
    this.worlds.cache.forEach((entry) => {
      if (!this.isExpired(entry, this.worldOptions.ttl)) {
        worlds.push(entry.data);
      }
    });
    return worlds;
  }

  /**
   * Get all players as array of values
   */
  public getAllPlayersValues(): PeerData[] {
    const players: PeerData[] = [];
    this.players.cache.forEach((entry) => {
      if (!this.isExpired(entry, this.playerOptions.ttl)) {
        players.push(entry.data);
      }
    });
    return players;
  }

  /**
   * Clear all worlds from cache
   */
  public clearWorlds(): void {
    this.worlds.cache.clear();
    this.worlds.stats.size = 0;
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired<T>(entry: CacheEntry<T>, ttl: number): boolean {
    return Date.now() - entry.createdAt > ttl;
  }

  /**
   * Evict the least recently used entry from cache
   */
  private evictLRU<K, T>(
    cache: Collection<K, CacheEntry<T>>,
    stats: CacheStats,
  ): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
      stats.evictions++;
      stats.size = cache.size;
    }
  }

  /**
   * Clean up expired entries from both caches
   */
  private cleanup(): void {
    let playerExpired = 0;
    let worldExpired = 0;

    // Cleanup players
    this.players.cache.forEach((entry, netID) => {
      if (this.isExpired(entry, this.playerOptions.ttl)) {
        this.players.cache.delete(netID);
        playerExpired++;
      }
    });

    // Cleanup worlds
    this.worlds.cache.forEach((entry, worldName) => {
      if (this.isExpired(entry, this.worldOptions.ttl)) {
        this.worlds.cache.delete(worldName);
        worldExpired++;
      }
    });

    if (playerExpired > 0 || worldExpired > 0) {
      logger.debug(
        `Cache cleanup: evicted ${playerExpired} players, ${worldExpired} worlds`,
      );
    }

    this.players.stats.size = this.players.cache.size;
    this.worlds.stats.size = this.worlds.cache.size;
    this.players.stats.evictions += playerExpired;
    this.worlds.stats.evictions += worldExpired;
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    const interval = Math.min(
      this.playerOptions.cleanupInterval,
      this.worldOptions.cleanupInterval,
    );

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, interval);
  }

  /**
   * Stop periodic cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Start periodic auto-save for idle cache entries
   */
  private startAutoSave(): void {
    const interval = Math.min(
      this.playerOptions.idleTime,
      this.worldOptions.idleTime,
    );

    this.saveTimer = setInterval(() => {
      this.saveIdleEntries();
    }, interval);
  }

  /**
   * Stop periodic auto-save
   */
  public stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
    }
  }

  /**
   * Save idle cache entries to database
   */
  private async saveIdleEntries(): Promise<void> {
    if (!this.database) return;

    const now = Date.now();
    let playersSaved = 0;
    let worldsSaved = 0;

    // Save idle players
    if (this.playerOptions.autoSave) {
      for (const [netID, entry] of this.players.cache) {
        const isIdle = now - entry.lastAccessed >= this.playerOptions.idleTime;
        if (isIdle && entry.dirty) {
          try {
            await this.savePlayerToDatabase(netID, entry);
            entry.dirty = false;
            entry.lastSaved = now;
            playersSaved++;
          } catch (error) {
            logger.error(`Failed to save player ${netID} to database: ${error}`);
          }
        }
      }
    }

    // Save idle worlds
    if (this.worldOptions.autoSave) {
      for (const [worldName, entry] of this.worlds.cache) {
        const isIdle = now - entry.lastAccessed >= this.worldOptions.idleTime;
        if (isIdle && entry.dirty) {
          try {
            await this.saveWorldToDatabase(worldName, entry);
            entry.dirty = false;
            entry.lastSaved = now;
            worldsSaved++;
          } catch (error) {
            logger.error(`Failed to save world ${worldName} to database: ${error}`);
          }
        }
      }
    }

    if (playersSaved > 0 || worldsSaved > 0) {
      logger.debug(
        `Auto-save completed: ${playersSaved} players, ${worldsSaved} worlds`,
      );
    }
  }

  /**
   * Save a player to database
   */
  private async savePlayerToDatabase(
    netID: number,
    entry: CacheEntry<PeerData>,
  ): Promise<void> {
    if (!this.database) return;

    const playerData = entry.data;

    
    // Update player in database using the player handler
    // Note: This assumes the player exists; adjust based on your logic
    // TODO:
    if (playerData.name) {
      await this.database.player.update(playerData.name, {
        displayName: playerData.displayName,
        clothing:    playerData.clothing,
        inventory:   playerData.inventory,
        role:        playerData.role,
      });
    }
  }

  /**
   * Save a world to database
   */
  private async saveWorldToDatabase(
    worldName: string,
    entry: CacheEntry<WorldData>,
  ): Promise<void> {
    if (!this.database) return;

    const worldData = entry.data;

    // Update world in database using the world handler
    await this.database.world.update(worldName, {
      width:   worldData.width,
      height:  worldData.height,
      weather: worldData.weather,
      // Add other fields as needed based on your WorldData structure
    });
  }

  /**
   * Manually save all dirty entries to database
   */
  public async saveAll(): Promise<void> {
    if (!this.database) {
      logger.warn("Cannot save: database not configured");
      return;
    }

    let playersSaved = 0;
    let worldsSaved = 0;

    // Save all dirty players
    for (const [netID, entry] of this.players.cache) {
      if (entry.dirty) {
        try {
          await this.savePlayerToDatabase(netID, entry);
          entry.dirty = false;
          entry.lastSaved = Date.now();
          playersSaved++;
        } catch (error) {
          logger.error(`Failed to save player ${netID}: ${error}`);
        }
      }
    }

    // Save all dirty worlds
    for (const [worldName, entry] of this.worlds.cache) {
      if (entry.dirty) {
        try {
          await this.saveWorldToDatabase(worldName, entry);
          entry.dirty = false;
          entry.lastSaved = Date.now();
          worldsSaved++;
        } catch (error) {
          logger.error(`Failed to save world ${worldName}: ${error}`);
        }
      }
    }

    logger.info(`Manual save completed: ${playersSaved} players, ${worldsSaved} worlds`);
  }

  /**
   * Save a specific player to database
   */
  public async savePlayer(netID: number): Promise<boolean> {
    if (!this.database) return false;

    const entry = this.players.cache.get(netID);
    if (!entry) return false;

    try {
      await this.savePlayerToDatabase(netID, entry);
      entry.dirty = false;
      entry.lastSaved = Date.now();
      return true;
    } catch (error) {
      logger.error(`Failed to save player ${netID}: ${error}`);
      return false;
    }
  }

  /**
   * Save a specific world to database
   */
  public async saveWorld(worldName: string): Promise<boolean> {
    if (!this.database) return false;

    const entry = this.worlds.cache.get(worldName);
    if (!entry) return false;

    try {
      await this.saveWorldToDatabase(worldName, entry);
      entry.dirty = false;
      entry.lastSaved = Date.now();
      return true;
    } catch (error) {
      logger.error(`Failed to save world ${worldName}: ${error}`);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    return {
      players: {
        ...this.players.stats,
        hitRate:
          this.players.stats.hits + this.players.stats.misses > 0
            ? (
              (this.players.stats.hits /
                (this.players.stats.hits + this.players.stats.misses)) *
              100
            ).toFixed(2) + "%"
            : "0%",
      },
      worlds: {
        ...this.worlds.stats,
        hitRate:
          this.worlds.stats.hits + this.worlds.stats.misses > 0
            ? (
              (this.worlds.stats.hits /
                (this.worlds.stats.hits + this.worlds.stats.misses)) *
              100
            ).toFixed(2) + "%"
            : "0%",
      },
    };
  }

  /**
   * Reset cache statistics
   */
  public resetStats(): void {
    this.players.stats = { hits: 0, misses: 0, size: this.players.cache.size, evictions: 0 };
    this.worlds.stats = { hits: 0, misses: 0, size: this.worlds.cache.size, evictions: 0 };
  }

  /**
   * Clear all caches
   */
  public clearAll(): void {
    this.clearPlayers();
    this.clearWorlds();
    logger.info("All caches cleared");
  }

  /**
   * Get cache sizes
   */
  public getSizes() {
    return {
      players: this.players.cache.size,
      worlds:  this.worlds.cache.size,
    };
  }

  /**
   * Destroy the state manager and cleanup resources
   */
  public async destroy(): Promise<void> {
    this.stopCleanup();
    this.stopAutoSave();
    
    // Save all dirty entries before destroying
    if (this.database) {
      await this.saveAll();
    }
    
    this.clearAll();
    logger.info("StateManager destroyed");
  }
}