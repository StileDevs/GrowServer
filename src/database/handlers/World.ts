import { type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, sql } from "drizzle-orm";
import { worlds } from "../schemas/World";
import { WorldData } from "../../types/world";

export class WorldDB {
  constructor(private db: LibSQLDatabase<Record<string, never>>) {}

  public async get(name: string) {
    const res = await this.db
      .select()
      .from(worlds)
      .where(eq(worlds.name, name))
      .limit(1)
      .execute();

    if (res.length) return res[0];
    return undefined;
  }

  public async has(name: string) {
    const res = await this.db
      .select({ count: sql`count(*)` })
      .from(worlds)
      .where(eq(worlds.name, name))
      .limit(1)
      .execute();

    return (res[0].count as number) > 0;
  }

  public async set(data: WorldData) {
    if (!data.name && !data.blocks && !data.width && !data.height) return 0;

    const res = await this.db.insert(worlds).values({
      name:       data.name,
      ownedBy:    data.owner ? data.owner.id : null,
      width:      data.width,
      height:     data.height,
      blocks:     Buffer.from(JSON.stringify(data.blocks)),
      owner:      data.owner ? Buffer.from(JSON.stringify(data.owner)) : null,
      dropped:    Buffer.from(JSON.stringify(data.dropped)),
      updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      weather_id: data.weatherId
    });

    if (res && res.lastInsertRowid) return res.lastInsertRowid;
    return 0;
  }

  public async save(data: WorldData) {
    if (!data.name && !data.blocks && !data.width && !data.height) return false;

    const res = await this.db
      .update(worlds)
      .set({
        ownedBy:    data.owner ? data.owner.id : null,
        width:      data.width,
        height:     data.height,
        blocks:     Buffer.from(JSON.stringify(data.blocks)),
        owner:      data.owner ? Buffer.from(JSON.stringify(data.owner)) : null,
        dropped:    Buffer.from(JSON.stringify(data.dropped)),
        updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
        weather_id: data.weatherId
      })
      .where(eq(worlds.name, data.name))
      .returning({ id: worlds.id });

    if (res.length) return true;
    return false;
  }
}
