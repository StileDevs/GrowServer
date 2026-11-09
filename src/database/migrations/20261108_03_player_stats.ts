import type { Kysely } from "kysely";

/**
 * Adds the profile statistics and the timed play mods to the players table:
 * - `playtime`: seconds spent online, shown in the profile;
 * - `play_mods`: JSON list of active timed play mods (`[{ "id", "expiresAt" }]`).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  try {
    await db.schema
      .alterTable("players")
      .addColumn("playtime", "integer", (col) => col.notNull().defaultTo(0))
      .execute();
  } catch {}

  try {
    await db.schema.alterTable("players").addColumn("play_mods", "text").execute();
  } catch {}
}

export async function down(db: Kysely<unknown>): Promise<void> {
  try {
    await db.schema.alterTable("players").dropColumn("play_mods").execute();
  } catch {}
  try {
    await db.schema.alterTable("players").dropColumn("playtime").execute();
  } catch {}
}
