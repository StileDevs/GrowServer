import type { Kysely } from "kysely";

/**
 * Adds the player home world to the players table: the world `/home` warps
 * to, set from `/sethome` or the world lock dialog.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  try {
    await db.schema.alterTable("players").addColumn("home_world", "text").execute();
  } catch {}
}

export async function down(db: Kysely<unknown>): Promise<void> {
  try {
    await db.schema.alterTable("players").dropColumn("home_world").execute();
  } catch {}
}
