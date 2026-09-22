import { sql } from "kysely";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import { db } from "../db";
import type { SessionRecord, PlayerRecord } from "../tables";
import { logger } from "../../utils/logger";

/**
 * Service managing Session database CRUD operations (Better-Auth inspired).
 */
export class SessionDB {
  /**
   * Creates a new authenticated session for a player with TTL.
   */
  public static async create(
    playerId: number,
    options: { ipAddress?: string; userAgent?: string | null; ttlDays?: number } = {},
  ): Promise<SessionRecord> {
    const id = nanoid(32);
    const token = nanoid(64);
    const ttlDays = options.ttlDays ?? 30;
    const expiresAt = dayjs().add(ttlDays, "day").toISOString();

    const result = await db
      .insertInto("sessions")
      .values({
        id,
        player_id: playerId,
        token,
        ip_address: options.ipAddress ?? "0.0.0.0",
        user_agent: options.userAgent ?? null,
        expires_at: expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.info({ sessionId: result.id, playerId }, "created session in database");
    return result;
  }

  /**
   * Retrieves an active session by its token, verifying that it has not expired.
   */
  public static async getByToken(token: string): Promise<SessionRecord | undefined> {
    const now = new Date().toISOString();
    return await db
      .selectFrom("sessions")
      .selectAll()
      .where("token", "=", token)
      .where("expires_at", ">", now)
      .executeTakeFirst();
  }

  /**
   * Retrieves an active session joined with player details.
   */
  public static async getWithPlayer(
    token: string,
  ): Promise<{ session: SessionRecord; player: PlayerRecord } | undefined> {
    const now = new Date().toISOString();
    const result = await db
      .selectFrom("sessions")
      .innerJoin("players", "players.id", "sessions.player_id")
      .selectAll("sessions")
      .select([
        "players.id as player_pk",
        "players.name as player_name",
        "players.display_name as player_display_name",
        "players.email as player_email",
        "players.email_verified as player_email_verified",
        "players.password as player_password",
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
      .where("sessions.token", "=", token)
      .where("sessions.expires_at", ">", now)
      .where("players.deleted_at", "is", null)
      .executeTakeFirst();

    if (!result) return undefined;

    const session: SessionRecord = {
      id: result.id,
      player_id: result.player_id,
      token: result.token,
      ip_address: result.ip_address,
      user_agent: result.user_agent,
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
      password: result.player_password,
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

    return { session, player };
  }

  /**
   * Revokes a session by its token.
   */
  public static async deleteByToken(token: string): Promise<void> {
    await db.deleteFrom("sessions").where("token", "=", token).execute();
  }

  /**
   * Revokes all active sessions for a given player ID (logout everywhere).
   */
  public static async deleteByPlayerId(playerId: number): Promise<void> {
    await db.deleteFrom("sessions").where("player_id", "=", playerId).execute();
  }

  /**
   * Cleans up expired sessions from the database.
   */
  public static async cleanExpired(): Promise<void> {
    const now = new Date().toISOString();
    await db.deleteFrom("sessions").where("expires_at", "<=", now).execute();
  }
}
