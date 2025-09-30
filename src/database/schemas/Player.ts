import { InferSelectModel, sql } from "drizzle-orm";
import { text, integer, sqliteTable, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const players = sqliteTable("players", {
  id:                  integer("id").primaryKey({ autoIncrement: true }),
  name:                text("name", { length: 255 }).notNull(),
  display_name:        text("display_name", { length: 255 }).notNull(),
  password:            text("password", { length: 255 }).notNull(),
  role:                text("role", { length: 255 }).notNull(),
  gems:                integer("gems").default(0),
  growtokens:          integer("growtokens").default(0),
  level:               integer("level").default(0),
  exp:                 integer("exp").default(0),
  clothing:            blob("clothing", { mode: "buffer" }),
  inventory:           blob("inventory", { mode: "buffer" }),
  last_visited_worlds: blob("last_visited_worlds", { mode: "buffer" }),
  created_at:          text("created_at").default(sql`(current_timestamp)`),
  updated_at:          text("updated_at").default(sql`(current_timestamp)`),
  heart_monitors:      blob("heart_monitors", { mode: "buffer" }).notNull(),
});

export type Players = InferSelectModel<typeof players>;
export const insertUserSchema = createInsertSchema(players);
export const selectUserSchema = createSelectSchema(players);
