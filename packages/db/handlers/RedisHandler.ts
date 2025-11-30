import { createClient, RedisClientType } from "redis";
import { logger } from "@growserver/logger";

export class RedisHandler {
  public client: RedisClientType;

  constructor() {
    const url = process.env.REDIS_URL!;
    
    this.client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error("Redis reconnection failed after 10 attempts");
            return new Error("Redis reconnection limit exceeded");
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on("error", (err) => {
      logger.error(`Redis Client Error: ${err.message}`);
    });

    this.client.on("connect", () => {
      logger.info("Redis client connecting...");
    });

    this.client.on("ready", () => {
      logger.info("Redis client ready");
    });

    this.client.on("reconnecting", () => {
      logger.warn("Redis client reconnecting...");
    });

    this.client.on("end", () => {
      logger.info("Redis client connection closed");
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info("Redis connected successfully");
    } catch (error) {
      logger.error(`Failed to connect to Redis: ${error}`);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info("Redis disconnected successfully");
    } catch (error) {
      logger.error(`Failed to disconnect from Redis: ${error}`);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Failed to get key ${key}: ${error}`);
      return null;
    }
  }

  public async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    try {
      if (expireSeconds) {
        await this.client.setEx(key, expireSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Failed to set key ${key}: ${error}`);
      throw error;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Failed to delete key ${key}: ${error}`);
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check existence of key ${key}: ${error}`);
      return false;
    }
  }

  public async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      return await this.client.hGet(key, field) ?? undefined;
    } catch (error) {
      logger.error(`Failed to get hash field ${field} from ${key}: ${error}`);
      return undefined;
    }
  }

  public async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      await this.client.hSet(key, field, value);
    } catch (error) {
      logger.error(`Failed to set hash field ${field} in ${key}: ${error}`);
      throw error;
    }
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error(`Failed to get all hash fields from ${key}: ${error}`);
      return {};
    }
  }

  public async hDel(key: string, field: string): Promise<void> {
    try {
      await this.client.hDel(key, field);
    } catch (error) {
      logger.error(`Failed to delete hash field ${field} from ${key}: ${error}`);
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error(`Failed to set expiration for key ${key}: ${error}`);
      throw error;
    }
  }

  public async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Failed to get TTL for key ${key}: ${error}`);
      return -1;
    }
  }

  public async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      logger.info("Redis cache cleared");
    } catch (error) {
      logger.error(`Failed to flush Redis: ${error}`);
      throw error;
    }
  }

  public async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      logger.error(`Redis ping failed: ${error}`);
      return false;
    }
  }
}
