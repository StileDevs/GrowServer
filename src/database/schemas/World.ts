import { InferSelectModel, sql } from "drizzle-orm";
import { text, integer, sqliteTable, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const worlds = sqliteTable("worlds", {
  id:         integer("id").primaryKey({ autoIncrement: true }),
  name:       text("name", { length: 255 }).notNull(),
  ownedBy:    integer("ownedBy"),
  owner:      blob("owner", { mode: "buffer" }),
  width:      integer("width").notNull(),
  height:     integer("height").notNull(),
  blocks:     blob("blocks", { mode: "buffer" }),
  dropped:    blob("dropped", { mode: "buffer" }),
  weather_id: integer("weather_id").default(41),
  created_at: text("created_at").default(sql`(current_timestamp)`),
  updated_at: text("updated_at").default(sql`(current_timestamp)`)
});

export type Worlds = InferSelectModel<typeof worlds>;
export const insertWorldSchema = createInsertSchema(worlds);
export const selectWorldSchema = createSelectSchema(worlds);
