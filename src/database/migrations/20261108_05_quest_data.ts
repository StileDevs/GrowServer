import type { Kysely } from "kysely";

/**
 * Adds `quest_data` to the players table: the JSON blob of the quest systems
 * (Crazy Jim delivery day, personal points, role xp/levels/claims, surgery
 * skill and surgery count).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  try {
    await db.schema.alterTable("players").addColumn("quest_data", "text").execute();
  } catch {}
}

export async function down(db: Kysely<unknown>): Promise<void> {
  try {
    await db.schema.alterTable("players").dropColumn("quest_data").execute();
  } catch {}
}
