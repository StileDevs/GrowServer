import { InferSelectModel, sql } from "drizzle-orm";
import { text, integer, sqliteTable, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  display_name: text("display_name", { length: 255 }).notNull(),
  password: text("password", { length: 255 }).notNull(),
  role: text("role", { length: 255 }).notNull(),
  gems: integer("gems").default(0),
  level: integer("level").default(0),
  exp: integer("exp").default(0),
  clothing: blob("clothing", { mode: "buffer" }),
  inventory: blob("inventory", { mode: "buffer" }),
  last_visited_worlds: blob("last_visited_worlds", { mode: "buffer" }),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  updated_at: text("updated_at").default(sql`(current_timestamp)`)
});

export const worlds = sqliteTable("worlds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  ownedBy: integer("ownedBy"),
  owner: blob("owner", { mode: "buffer" }),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  blockCount: integer("blockCount").notNull(),
  blocks: blob("blocks", { mode: "buffer" }),
  dropped: blob("dropped", { mode: "buffer" }),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  updated_at: text("updated_at").default(sql`(current_timestamp)`)
});

export type Users = InferSelectModel<typeof users>;
export type Worlds = InferSelectModel<typeof worlds>;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertWorldSchema = createInsertSchema(worlds);
export const selectWorldSchema = createSelectSchema(worlds);
