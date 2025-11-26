import { InferSelectModel, sql } from "drizzle-orm";
import { text, integer, pgTable, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  display_name: text("display_name").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  gems: integer("gems").default(0),
  level: integer("level").default(0),
  exp: integer("exp").default(0),
  clothing: text("clothing"),
  inventory: text("inventory"),
  last_visited_worlds: text("last_visited_worlds"),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  updated_at: text("updated_at").default(sql`(current_timestamp)`),
  heart_monitors: text("heart_monitors").notNull(),
});

export type Players = InferSelectModel<typeof players>;
export const insertUserSchema = createInsertSchema(players);
export const selectUserSchema = createSelectSchema(players);
