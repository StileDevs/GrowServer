import { sql } from "kysely";
import { db } from "../db";
import type { NewPlayerRecord, PlayerRecord, PlayerRecordUpdate } from "../tables";
import { logger } from "../../utils/logger";

/**
 * Service managing Player database CRUD operations.
 */
export class PlayerDB {
  /**
   * Inserts a new player into the database.
   */
  public static async create(data: NewPlayerRecord): Promise<PlayerRecord> {
    const result = await db
      .insertInto("players")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.info({ id: result.id, name: result.name }, "created player in database");
    return result;
  }

  /**
   * Retrieves a player by their primary ID.
   */
  public static async getById(id: number): Promise<PlayerRecord | undefined> {
    return await db
      .selectFrom("players")
      .selectAll()
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
  }

  /**
   * Retrieves a player by their exact username (case-insensitive).
   */
  public static async getByName(name: string): Promise<PlayerRecord | undefined> {
    const cleanName = name.trim();
    return await db
      .selectFrom("players")
      .selectAll()
      .where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
  }

  /**
   * Retrieves a player by their display name.
   */
  public static async getByDisplayName(displayName: string): Promise<PlayerRecord | undefined> {
    const cleanName = displayName.trim();
    return await db
      .selectFrom("players")
      .selectAll()
      .where("display_name", "=", cleanName)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
  }

  /**
   * Checks if a username already exists.
   */
  public static async exists(name: string): Promise<boolean> {
    const cleanName = name.trim();
    const result = await db
      .selectFrom("players")
      .select("id")
      .where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()))
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return result !== undefined;
  }

  /**
   * Finds all players registered with a specific IP address.
   */
  public static async getByIp(ip: string): Promise<PlayerRecord[]> {
    return await db
      .selectFrom("players")
      .selectAll()
      .where("ip", "=", ip)
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Finds all players associated with a MAC address.
   */
  public static async getByMac(mac: string): Promise<PlayerRecord[]> {
    return await db
      .selectFrom("players")
      .selectAll()
      .where("mac", "=", mac)
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Finds all players matching a GrowID hash (GID).
   */
  public static async getByGid(gid: Uint8Array): Promise<PlayerRecord[]> {
    return await db
      .selectFrom("players")
      .selectAll()
      .where("gid", "=", gid)
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Finds all players matching a Registration ID (RID).
   */
  public static async getByRid(rid: Uint8Array): Promise<PlayerRecord[]> {
    return await db
      .selectFrom("players")
      .selectAll()
      .where("rid", "=", rid)
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Searches players by username keyword.
   */
  public static async search(keyword: string, limit = 20): Promise<PlayerRecord[]> {
    const cleanKeyword = keyword.trim().toLowerCase();
    return await db
      .selectFrom("players")
      .selectAll()
      .where((eb) => eb(eb.fn("lower", ["name"]), "like", `%${cleanKeyword}%`))
      .where("deleted_at", "is", null)
      .limit(limit)
      .execute();
  }

  /**
   * Updates player data by ID.
   */
  public static async updateById(id: number, data: PlayerRecordUpdate): Promise<void> {
    await db
      .updateTable("players")
      .set({
        ...data,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Updates player data by username.
   */
  public static async updateByName(name: string, data: PlayerRecordUpdate): Promise<void> {
    const cleanName = name.trim();
    await db
      .updateTable("players")
      .set({
        ...data,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()))
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Atomically increments or decrements player gems.
   */
  public static async addGems(nameOrId: string | number, amount: number): Promise<void> {
    let query = db
      .updateTable("players")
      .set((eb) => ({
        gems: eb("gems", "+", amount),
        updated_at: sql`CURRENT_TIMESTAMP`,
      }))
      .where("deleted_at", "is", null);

    if (typeof nameOrId === "number") {
      query = query.where("id", "=", nameOrId);
    } else {
      const cleanName = nameOrId.trim();
      query = query.where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()));
    }

    await query.execute();
  }

  /**
   * Atomically increments player XP.
   */
  public static async addXp(nameOrId: string | number, amount: number): Promise<void> {
    let query = db
      .updateTable("players")
      .set((eb) => ({
        xp: eb("xp", "+", amount),
        updated_at: sql`CURRENT_TIMESTAMP`,
      }))
      .where("deleted_at", "is", null);

    if (typeof nameOrId === "number") {
      query = query.where("id", "=", nameOrId);
    } else {
      const cleanName = nameOrId.trim();
      query = query.where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()));
    }

    await query.execute();
  }

  /**
   * Updates last seen timestamp and optional IP for a player.
   */
  public static async updateLastSeen(nameOrId: string | number, ip?: string): Promise<void> {
    let query = db
      .updateTable("players")
      .set({
        last_seen_time: sql`CURRENT_TIMESTAMP`,
        updated_at: sql`CURRENT_TIMESTAMP`,
        ...(ip ? { ip } : {}),
      })
      .where("deleted_at", "is", null);

    if (typeof nameOrId === "number") {
      query = query.where("id", "=", nameOrId);
    } else {
      const cleanName = nameOrId.trim();
      query = query.where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()));
    }

    await query.execute();
  }

  /**
   * Soft-deletes a player by ID or username.
   */
  public static async softDelete(nameOrId: string | number): Promise<void> {
    let query = db
      .updateTable("players")
      .set({
        deleted_at: sql`CURRENT_TIMESTAMP`,
      });

    if (typeof nameOrId === "number") {
      query = query.where("id", "=", nameOrId);
    } else {
      const cleanName = nameOrId.trim();
      query = query.where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()));
    }

    await query.execute();
    logger.info({ target: nameOrId }, "soft-deleted player in database");
  }

  /**
   * Restores a soft-deleted player.
   */
  public static async restore(nameOrId: string | number): Promise<void> {
    let query = db
      .updateTable("players")
      .set({
        deleted_at: null,
      });

    if (typeof nameOrId === "number") {
      query = query.where("id", "=", nameOrId);
    } else {
      const cleanName = nameOrId.trim();
      query = query.where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()));
    }

    await query.execute();
    logger.info({ target: nameOrId }, "restored player in database");
  }

  /**
   * Permanently deletes a player record.
   */
  public static async deletePermanently(nameOrId: string | number): Promise<void> {
    let query = db.deleteFrom("players");

    if (typeof nameOrId === "number") {
      query = query.where("id", "=", nameOrId);
    } else {
      const cleanName = nameOrId.trim();
      query = query.where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()));
    }

    await query.execute();
    logger.info({ target: nameOrId }, "permanently deleted player in database");
  }
}
