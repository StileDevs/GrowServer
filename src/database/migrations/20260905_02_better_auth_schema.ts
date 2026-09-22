import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. Add email columns to players table if they don't already exist
  try {
    await db.schema
      .alterTable("players")
      .addColumn("email", "text")
      .execute();
  } catch {}

  try {
    await db.schema
      .alterTable("players")
      .addColumn("email_verified", "integer", (col) => col.notNull().defaultTo(0))
      .execute();
  } catch {}

  try {
    await db.schema.createIndex("idx_players_email").on("players").column("email").ifNotExists().execute();
  } catch {}

  // 2. Create accounts table (Better-Auth inspired for multi-provider auth & credentials)
  await db.schema
    .createTable("accounts")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("player_id", "integer", (col) => col.notNull().references("players.id").onDelete("cascade"))
    .addColumn("provider_id", "text", (col) => col.notNull())
    .addColumn("account_id", "text", (col) => col.notNull())
    .addColumn("password", "text")
    .addColumn("access_token", "text")
    .addColumn("refresh_token", "text")
    .addColumn("expires_at", "text")
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex("idx_accounts_provider_account")
    .on("accounts")
    .columns(["provider_id", "account_id"])
    .unique()
    .ifNotExists()
    .execute();

  await db.schema.createIndex("idx_accounts_player_id").on("accounts").column("player_id").ifNotExists().execute();

  // 3. Create sessions table (Better-Auth inspired for active game webview / dashboard sessions)
  await db.schema
    .createTable("sessions")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("player_id", "integer", (col) => col.notNull().references("players.id").onDelete("cascade"))
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("ip_address", "text", (col) => col.notNull().defaultTo("0.0.0.0"))
    .addColumn("user_agent", "text")
    .addColumn("expires_at", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema.createIndex("idx_sessions_token").on("sessions").column("token").ifNotExists().execute();
  await db.schema.createIndex("idx_sessions_player_id").on("sessions").column("player_id").ifNotExists().execute();
  await db.schema.createIndex("idx_sessions_expires_at").on("sessions").column("expires_at").ifNotExists().execute();

  // 4. Create verifications table (Better-Auth inspired for OTP, password reset, and device tokens)
  await db.schema
    .createTable("verifications")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("identifier", "text", (col) => col.notNull())
    .addColumn("value", "text", (col) => col.notNull())
    .addColumn("expires_at", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex("idx_verifications_identifier_value")
    .on("verifications")
    .columns(["identifier", "value"])
    .ifNotExists()
    .execute();

  await db.schema.createIndex("idx_verifications_expires_at").on("verifications").column("expires_at").ifNotExists().execute();

  // 5. Migrate any existing player passwords into accounts table with provider_id = 'credential'
  await sql`
    INSERT OR IGNORE INTO accounts (player_id, provider_id, account_id, password, created_at, updated_at)
    SELECT id, 'credential', name, password, created_at, updated_at
    FROM players
    WHERE password IS NOT NULL AND name != ''
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("verifications").ifExists().execute();
  await db.schema.dropTable("sessions").ifExists().execute();
  await db.schema.dropTable("accounts").ifExists().execute();
}
