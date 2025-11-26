import { InferSelectModel, sql } from "drizzle-orm";
import { text, integer, pgTable, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const worlds = pgTable("worlds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownedBy: integer("ownedBy"),
  // owner:         blob("owner", { mode: "buffer" }),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  blocks: text("blocks"),
  dropped: text("dropped"),
  weather_id: integer("weather_id").default(41),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  updated_at: text("updated_at").default(sql`(current_timestamp)`),
  worldlock_index: integer("worldlock_index"),
  // minimum_level: integer("minimum_level").default(1)
});

export type Worlds = InferSelectModel<typeof worlds>;
export const insertWorldSchema = createInsertSchema(worlds);
export const selectWorldSchema = createSelectSchema(worlds);
