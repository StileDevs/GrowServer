import { promises as fs } from "node:fs";
import * as path from "node:path";
import { sql } from "kysely";
import { db } from "../db";
import type { NewWorldRecord, WorldRecord, WorldRecordUpdate } from "../tables";
import { logger } from "../../utils/logger";

/**
 * Service managing World database CRUD operations and atomic binary storage.
 */
export class WorldDB {
  private static baseStoragePath = path.join(process.cwd(), "data", "worlds");

  /**
   * Computes the deterministic absolute path for a world binary file.
   */
  public static getFilePath(worldName: string): string {
    const cleanName = worldName.trim().toLowerCase();
    const firstChar = cleanName[0] || "_";

    let folder = "other";
    if (/[a-z]/.test(firstChar)) {
      folder = firstChar;
    } else if (/[0-9]/.test(firstChar)) {
      folder = "0-9";
    }

    return path.join(this.baseStoragePath, folder, `${cleanName}.bin`);
  }

  /**
   * Checks if a world's binary file exists on disk.
   */
  public static async hasBinary(worldName: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(worldName));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads raw binary MAP_DATA for a given world.
   */
  public static async readBinary(worldName: string): Promise<Buffer | null> {
    const filePath = this.getFilePath(worldName);

    try {
      return await fs.readFile(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      logger.error({ err, world: worldName }, "failed to read world binary");
      throw err;
    }
  }

  /**
   * Writes raw binary MAP_DATA atomically using temporary file swap.
   */
  public static async writeBinary(worldName: string, buffer: Uint8Array | Buffer): Promise<void> {
    const targetFile = this.getFilePath(worldName);
    const targetDir = path.dirname(targetFile);
    const tempFile = `${targetFile}.tmp`;

    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(tempFile, buffer);
      await fs.rename(tempFile, targetFile);
    } catch (err) {
      logger.error({ err, world: worldName }, "failed to write world binary");
      await fs.unlink(tempFile).catch(() => {});
      throw err;
    }
  }

  /**
   * Creates a backup copy of the world binary in the backup folder.
   */
  public static async backupBinary(worldName: string): Promise<string | null> {
    const sourceFile = this.getFilePath(worldName);
    const backupDir = path.join(this.baseStoragePath, "_backups");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `${worldName.toLowerCase()}_${timestamp}.bin`);

    try {
      await fs.mkdir(backupDir, { recursive: true });
      await fs.copyFile(sourceFile, backupFile);
      return backupFile;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      logger.error({ err, world: worldName }, "failed to backup world binary");
      return null;
    }
  }

  /**
   * Deletes a world's binary file from disk.
   */
  public static async deleteBinary(worldName: string): Promise<void> {
    const filePath = this.getFilePath(worldName);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.error({ err, world: worldName }, "failed to delete world binary");
        throw err;
      }
    }
  }

  /**
   * Inserts a new world record into the database.
   */
  public static async create(name: string, version = 17): Promise<WorldRecord> {
    const upperName = name.trim().toUpperCase();

    const result = await db
      .insertInto("worlds")
      .values({
        name: upperName,
        version,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.info({ world: upperName }, "created world record in database");
    return result;
  }

  /**
   * Retrieves world metadata by name (case-insensitive) excluding soft-deleted records.
   */
  public static async getByName(name: string): Promise<WorldRecord | undefined> {
    const cleanName = name.trim();
    return await db
      .selectFrom("worlds")
      .selectAll()
      .where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
  }

  /**
   * Retrieves world metadata by ID.
   */
  public static async getById(id: number): Promise<WorldRecord | undefined> {
    return await db
      .selectFrom("worlds")
      .selectAll()
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
  }

  /**
   * Checks if a world name exists in the database.
   */
  public static async exists(name: string): Promise<boolean> {
    const cleanName = name.trim();
    const result = await db
      .selectFrom("worlds")
      .select("id")
      .where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()))
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return result !== undefined;
  }

  /**
   * Updates world metadata by ID.
   */
  public static async updateById(id: number, data: WorldRecordUpdate): Promise<void> {
    await db
      .updateTable("worlds")
      .set({
        ...data,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Updates world metadata by name.
   */
  public static async updateByName(name: string, data: WorldRecordUpdate): Promise<void> {
    const cleanName = name.trim();
    await db
      .updateTable("worlds")
      .set({
        ...data,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()))
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Soft-deletes a world by setting deleted_at timestamp.
   */
  public static async softDelete(nameOrId: string | number): Promise<void> {
    let query = db
      .updateTable("worlds")
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
    logger.info({ target: nameOrId }, "soft-deleted world in database");
  }

  /**
   * Restores a soft-deleted world.
   */
  public static async restore(nameOrId: string | number): Promise<void> {
    let query = db
      .updateTable("worlds")
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
    logger.info({ target: nameOrId }, "restored world in database");
  }

  /**
   * Permanently deletes a world from the database and optionally removes its binary file.
   */
  public static async deletePermanently(nameOrId: string | number, removeBinary = true): Promise<void> {
    let worldName: string | undefined;

    if (typeof nameOrId === "string") {
      worldName = nameOrId;
    } else {
      const record = await this.getById(nameOrId);
      worldName = record?.name;
    }

    let query = db.deleteFrom("worlds");
    if (typeof nameOrId === "number") {
      query = query.where("id", "=", nameOrId);
    } else {
      const cleanName = nameOrId.trim();
      query = query.where((eb) => eb(eb.fn("lower", ["name"]), "=", cleanName.toLowerCase()));
    }

    await query.execute();
    logger.info({ target: nameOrId }, "permanently deleted world record in database");

    if (removeBinary && worldName) {
      await this.deleteBinary(worldName);
    }
  }

  /**
   * Searches worlds by name keyword using database index.
   */
  public static async search(keyword: string, limit = 20): Promise<WorldRecord[]> {
    const cleanKeyword = keyword.trim().toLowerCase();

    return await db
      .selectFrom("worlds")
      .selectAll()
      .where((eb) => eb(eb.fn("lower", ["name"]), "like", `%${cleanKeyword}%`))
      .where("deleted_at", "is", null)
      .limit(limit)
      .execute();
  }

  /**
   * Lists recently updated worlds.
   */
  public static async listRecent(limit = 20): Promise<WorldRecord[]> {
    return await db
      .selectFrom("worlds")
      .selectAll()
      .where("deleted_at", "is", null)
      .orderBy("updated_at", "desc")
      .limit(limit)
      .execute();
  }
}
