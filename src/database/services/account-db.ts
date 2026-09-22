import { sql } from "kysely";
import { db } from "../db";
import type { AccountRecord, NewAccountRecord, AccountRecordUpdate, PlayerRecord } from "../tables";
import { logger } from "../../utils/logger";

/**
 * Service managing Account database CRUD operations (Better-Auth inspired).
 */
export class AccountDB {
  /**
   * Links a new authentication account to a player.
   */
  public static async create(data: NewAccountRecord): Promise<AccountRecord> {
    const result = await db
      .insertInto("accounts")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.info({ id: result.id, playerId: result.player_id, provider: result.provider_id }, "created account record in database");
    return result;
  }

  /**
   * Retrieves an account by provider ID and account ID.
   */
  public static async getByProvider(providerId: string, accountId: string): Promise<AccountRecord | undefined> {
    const cleanAccountId = accountId.trim().toLowerCase();
    return await db
      .selectFrom("accounts")
      .selectAll()
      .where("provider_id", "=", providerId)
      .where((eb) => eb(eb.fn("lower", ["account_id"]), "=", cleanAccountId))
      .executeTakeFirst();
  }

  /**
   * Retrieves all linked accounts for a given player ID.
   */
  public static async getByPlayerId(playerId: number): Promise<AccountRecord[]> {
    return await db
      .selectFrom("accounts")
      .selectAll()
      .where("player_id", "=", playerId)
      .execute();
  }

  /**
   * Performs an inner join to retrieve both account credentials and active player data in a single query.
   */
  public static async getWithPlayer(
    providerId: string,
    accountId: string,
  ): Promise<{ account: AccountRecord; player: PlayerRecord } | undefined> {
    const cleanAccountId = accountId.trim().toLowerCase();
    const result = await db
      .selectFrom("accounts")
      .innerJoin("players", "players.id", "accounts.player_id")
      .selectAll("accounts")
      .select([
        "players.id as player_pk",
        "players.name as player_name",
        "players.display_name as player_display_name",
        "players.email as player_email",
        "players.email_verified as player_email_verified",
        "players.password as player_legacy_password",
        "players.ip as player_ip",
        "players.mac as player_mac",
        "players.rid as player_rid",
        "players.gid as player_gid",
        "players.vid as player_vid",
        "players.sid as player_sid",
        "players.platform_type as player_platform_type",
        "players.hash as player_hash",
        "players.skin_color as player_skin_color",
        "players.gems as player_gems",
        "players.level as player_level",
        "players.xp as player_xp",
        "players.role_id as player_role_id",
        "players.inventory as player_inventory",
        "players.last_seen_time as player_last_seen_time",
        "players.created_at as player_created_at",
        "players.updated_at as player_updated_at",
        "players.deleted_at as player_deleted_at",
      ])
      .where("accounts.provider_id", "=", providerId)
      .where((eb) => eb(eb.fn("lower", ["accounts.account_id"]), "=", cleanAccountId))
      .where("players.deleted_at", "is", null)
      .executeTakeFirst();

    if (!result) return undefined;

    const account: AccountRecord = {
      id: result.id,
      player_id: result.player_id,
      provider_id: result.provider_id,
      account_id: result.account_id,
      password: result.password,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_at: result.expires_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };

    const player: PlayerRecord = {
      id: result.player_pk,
      name: result.player_name,
      display_name: result.player_display_name,
      email: result.player_email,
      email_verified: result.player_email_verified,
      password: result.player_legacy_password,
      ip: result.player_ip,
      mac: result.player_mac,
      rid: result.player_rid,
      gid: result.player_gid,
      vid: result.player_vid,
      sid: result.player_sid,
      platform_type: result.player_platform_type,
      hash: result.player_hash,
      skin_color: result.player_skin_color,
      gems: result.player_gems,
      level: result.player_level,
      xp: result.player_xp,
      role_id: result.player_role_id,
      inventory: result.player_inventory,
      last_seen_time: result.player_last_seen_time,
      created_at: result.player_created_at,
      updated_at: result.player_updated_at,
      deleted_at: result.player_deleted_at,
    };

    return { account, player };
  }

  /**
   * Updates password hash for a player's credential account.
   */
  public static async updatePassword(playerId: number, hashedPassword: string, providerId = "credential"): Promise<void> {
    await db
      .updateTable("accounts")
      .set({
        password: hashedPassword,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where("player_id", "=", playerId)
      .where("provider_id", "=", providerId)
      .execute();

    // Also sync with legacy player record column for backward-compatibility
    await db
      .updateTable("players")
      .set({
        password: hashedPassword,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", playerId)
      .execute();
  }

  /**
   * Updates OAuth access/refresh tokens for an account.
   */
  public static async updateTokens(
    id: number,
    accessToken: string | null,
    refreshToken: string | null,
    expiresAt: string | null,
  ): Promise<void> {
    await db
      .updateTable("accounts")
      .set({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", id)
      .execute();
  }

  /**
   * Deletes all accounts for a player.
   */
  public static async deleteByPlayerId(playerId: number): Promise<void> {
    await db.deleteFrom("accounts").where("player_id", "=", playerId).execute();
  }
}
