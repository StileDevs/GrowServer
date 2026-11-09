import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("players")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("mac", "text")
    .addColumn("ip", "text", (col) => col.notNull().defaultTo("0.0.0.0"))
    .addColumn("name", "text", (col) => col.defaultTo(""))
    .addColumn("display_name", "text", (col) => col.defaultTo(""))
    .addColumn("password", "text")
    .addColumn("last_seen_time", "text")
    .addColumn("rid", "blob", (col) => col.notNull().defaultTo(sql`x'00000000000000000000000000000000'`))
    .addColumn("platform_type", "integer", (col) => col.notNull().defaultTo(-1))
    .addColumn("gid", "blob", (col) => col.notNull().defaultTo(sql`x'00000000000000000000000000000000'`))
    .addColumn("inventory", "blob")
    .addColumn("role_id", "integer")
    .addColumn("vid", "blob", (col) => col.notNull().defaultTo(sql`x'00000000000000000000000000000000'`))
    .addColumn("hash", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("sid", "blob", (col) => col.notNull().defaultTo(sql`x'00000000000000000000000000000000'`))
    .addColumn("skin_color", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("gems", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("level", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("xp", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("deleted_at", "text")
    .execute();

  await db.schema.createIndex("idx_players_gid").on("players").column("gid").ifNotExists().execute();
  await db.schema.createIndex("idx_players_rid").on("players").column("rid").ifNotExists().execute();
  await db.schema.createIndex("idx_players_ip").on("players").column("ip").ifNotExists().execute();
  await db.schema.createIndex("idx_players_vid").on("players").column("vid").ifNotExists().execute();
  await db.schema.createIndex("idx_players_hash").on("players").column("hash").ifNotExists().execute();
  await db.schema.createIndex("idx_players_sid").on("players").column("sid").ifNotExists().execute();
  await db.schema.createIndex("idx_players_name").on("players").column("name").ifNotExists().execute();
  await db.schema.createIndex("idx_players_display_name").on("players").column("display_name").ifNotExists().execute();
  await db.schema.createIndex("idx_players_deleted_at").on("players").column("deleted_at").ifNotExists().execute();

  await db.schema
    .createTable("worlds")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("deleted_at", "text")
    .execute();

  await db.schema.createIndex("idx_worlds_name").on("worlds").column("name").ifNotExists().execute();
  await db.schema.createIndex("idx_worlds_deleted_at").on("worlds").column("deleted_at").ifNotExists().execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("worlds").ifExists().execute();
  await db.schema.dropTable("players").ifExists().execute();
}
