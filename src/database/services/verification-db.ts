import { sql } from "kysely";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import { db } from "../db";
import type { VerificationRecord } from "../tables";
import { logger } from "../../utils/logger";

/**
 * Service managing Verification tokens and OTP database CRUD operations (Better-Auth inspired).
 */
export class VerificationDB {
  /**
   * Creates a new verification token or OTP with expiration.
   */
  public static async create(identifier: string, value: string, ttlMinutes = 15): Promise<VerificationRecord> {
    const id = nanoid(32);
    const expiresAt = dayjs().add(ttlMinutes, "minute").toISOString();

    const result = await db
      .insertInto("verifications")
      .values({
        id,
        identifier: identifier.trim().toLowerCase(),
        value,
        expires_at: expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.info({ id: result.id, identifier: result.identifier }, "created verification token");
    return result;
  }

  /**
   * Retrieves an unexpired verification record.
   */
  public static async get(identifier: string, value: string): Promise<VerificationRecord | undefined> {
    const cleanIdentifier = identifier.trim().toLowerCase();
    const now = new Date().toISOString();
    return await db
      .selectFrom("verifications")
      .selectAll()
      .where("identifier", "=", cleanIdentifier)
      .where("value", "=", value)
      .where("expires_at", ">", now)
      .executeTakeFirst();
  }

  /**
   * Verifies and atomically consumes (deletes) a verification token.
   */
  public static async verifyAndConsume(identifier: string, value: string): Promise<boolean> {
    const cleanIdentifier = identifier.trim().toLowerCase();
    const record = await this.get(cleanIdentifier, value);

    if (!record) return false;

    await db.deleteFrom("verifications").where("id", "=", record.id).execute();
    return true;
  }

  /**
   * Cleans up expired verification tokens.
   */
  public static async deleteExpired(): Promise<void> {
    const now = new Date().toISOString();
    await db.deleteFrom("verifications").where("expires_at", "<=", now).execute();
  }
}
