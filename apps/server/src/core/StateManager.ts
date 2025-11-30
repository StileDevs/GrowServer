import type { PeerData, WorldData } from "@growserver/types";
import type { Database } from "@growserver/db";
import { Collection } from "@growserver/utils";
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


// TODO: create new world caching structure & implement tileMap to gain O(1) (and also maybe server pool?)
export class StateManager {
  private playerCache: Collection<number, CacheEntry<PeerData>>;
  private worldCache: Collection<string, CacheEntry<WorldData>>;
  private playerStats: CacheStats;
  private worldStats: CacheStats;
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
    this.playerCache = new Collection();
    this.worldCache = new Collection();
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

    this.playerStats = { hits: 0, misses: 0, size: 0, evictions: 0 };
    this.worldStats = { hits: 0, misses: 0, size: 0, evictions: 0 };

    this.startCleanup();
    if (this.database && (this.playerOptions.autoSave || this.worldOptions.autoSave)) {
      this.startAutoSave();
    }
  }

  /**
   * Get a player from cache
   */
  public getPlayer(netID: number): PeerData | undefined {
    const entry = this.playerCache.get(netID);

    if (!entry) {
      this.playerStats.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry, this.playerOptions.ttl)) {
      this.playerCache.delete(netID);
      this.playerStats.misses++;
      this.playerStats.evictions++;
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.playerStats.hits++;
    return entry.data;
  }

  /**
   * Set a player in cache
   */
  public setPlayer(netID: number, data: PeerData): void {
    // Enforce max size by evicting least recently used
    if (
      this.playerCache.size >= this.playerOptions.maxSize &&
      !this.playerCache.has(netID)
    ) {
      this.evictLRU(this.playerCache, this.playerStats);
    }

    const entry: CacheEntry<PeerData> = {
      data,
      lastAccessed: Date.now(),
      createdAt:    Date.now(),
      dirty:        true,
      lastSaved:    Date.now(),
    };

    this.playerCache.set(netID, entry);
    this.playerStats.size = this.playerCache.size;
  }

  /**
   * Delete a player from cache
   */
  public deletePlayer(netID: number): boolean {
    const result = this.playerCache.delete(netID);
    this.playerStats.size = this.playerCache.size;
    return result;
  }

  /**
   * Check if player exists in cache
   */
  public hasPlayer(netID: number): boolean {
    const entry = this.playerCache.get(netID);
    if (!entry) return false;
    return !this.isExpired(entry, this.playerOptions.ttl);
  }

  /**
   * Get all players from cache
   */
  public getAllPlayers(): Collection<number, PeerData> {
    const players = new Collection<number, PeerData>();
    this.playerCache.forEach((entry, netID) => {
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
    this.playerCache.clear();
    this.playerStats.size = 0;
  }

  /**
   * Get a world from cache
   */
  public getWorld(worldName: string): WorldData | undefined {
    const entry = this.worldCache.get(worldName);

    if (!entry) {
      this.worldStats.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry, this.worldOptions.ttl)) {
      this.worldCache.delete(worldName);
      this.worldStats.misses++;
      this.worldStats.evictions++;
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.worldStats.hits++;
    return entry.data;
  }

  /**
   * Set a world in cache
   */
  public setWorld(worldName: string, data: WorldData): void {
    // Enforce max size by evicting least recently used
    if (
      this.worldCache.size >= this.worldOptions.maxSize &&
      !this.worldCache.has(worldName)
    ) {
      this.evictLRU(this.worldCache, this.worldStats);
    }

    const entry: CacheEntry<WorldData> = {
      data,
      lastAccessed: Date.now(),
      createdAt:    Date.now(),
      dirty:        true,
      lastSaved:    Date.now(),
    };

    this.worldCache.set(worldName, entry);
    this.worldStats.size = this.worldCache.size;
  }

  /**
   * Delete a world from cache
   */
  public deleteWorld(worldName: string): boolean {
    const result = this.worldCache.delete(worldName);
    this.worldStats.size = this.worldCache.size;
    return result;
  }

  /**
   * Check if world exists in cache
   */
  public hasWorld(worldName: string): boolean {
    const entry = this.worldCache.get(worldName);
    if (!entry) return false;
    return !this.isExpired(entry, this.worldOptions.ttl);
  }

  /**
   * Get all worlds from cache
   */
  public getAllWorlds(): Collection<string, WorldData> {
    const worlds = new Collection<string, WorldData>();
    this.worldCache.forEach((entry, worldName) => {
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
    this.worldCache.forEach((entry) => {
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
    this.playerCache.forEach((entry) => {
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
    this.worldCache.clear();
    this.worldStats.size = 0;
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
    this.playerCache.forEach((entry, netID) => {
      if (this.isExpired(entry, this.playerOptions.ttl)) {
        this.playerCache.delete(netID);
        playerExpired++;
      }
    });

    // Cleanup worlds
    this.worldCache.forEach((entry, worldName) => {
      if (this.isExpired(entry, this.worldOptions.ttl)) {
        this.worldCache.delete(worldName);
        worldExpired++;
      }
    });

    if (playerExpired > 0 || worldExpired > 0) {
      logger.debug(
        `Cache cleanup: evicted ${playerExpired} players, ${worldExpired} worlds`,
      );
    }

    this.playerStats.size = this.playerCache.size;
    this.worldStats.size = this.worldCache.size;
    this.playerStats.evictions += playerExpired;
    this.worldStats.evictions += worldExpired;
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
      for (const [netID, entry] of this.playerCache) {
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
      for (const [worldName, entry] of this.worldCache) {
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
    for (const [netID, entry] of this.playerCache) {
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
    for (const [worldName, entry] of this.worldCache) {
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

    const entry = this.playerCache.get(netID);
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

    const entry = this.worldCache.get(worldName);
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
        ...this.playerStats,
        hitRate:
          this.playerStats.hits + this.playerStats.misses > 0
            ? (
              (this.playerStats.hits /
                (this.playerStats.hits + this.playerStats.misses)) *
              100
            ).toFixed(2) + "%"
            : "0%",
      },
      worlds: {
        ...this.worldStats,
        hitRate:
          this.worldStats.hits + this.worldStats.misses > 0
            ? (
              (this.worldStats.hits /
                (this.worldStats.hits + this.worldStats.misses)) *
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
    this.playerStats = { hits: 0, misses: 0, size: this.playerCache.size, evictions: 0 };
    this.worldStats = { hits: 0, misses: 0, size: this.worldCache.size, evictions: 0 };
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
      players: this.playerCache.size,
      worlds:  this.worldCache.size,
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