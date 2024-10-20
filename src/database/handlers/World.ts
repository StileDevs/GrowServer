import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { worlds, type Worlds } from "../schemas/World.js";

export class WorldDB {
  constructor(private db: BetterSQLite3Database<Record<string, never>>) {}

  public async get(name: string) {
    const res = await this.db.select().from(worlds).where(eq(worlds.name, name));

    if (res.length) return res[0];
    return undefined;
  }

  public async set(data: Worlds) {
    if (!data.name && !data.blockCount && !data.blocks && !data.width && !data.height) return 0;

    // const res = await this.db.insert(worlds).values({
    //   name: data.name,
    //   ownedBy: data.ownedBy,
    //   blockCount: data.blockCount,
    //   width: data.width,
    //   height: data.height,
    //   blocks: data.blocks,
    //   owner: data.owner,
    //   dropped: data.dropped,
    //   weather_id: data.weather_id
    // });
    const res = await this.db.insert(worlds).values(data);

    if (res && res.lastInsertRowid) return res.lastInsertRowid;
    return 0;
  }

  public async save(data: Worlds) {
    if (!data.name && !data.blockCount && !data.blocks && !data.width && !data.height) return false;

    const res = await this.db
      .update(worlds)
      // .set({
      //   ownedBy,
      //   blockCount,
      //   width,
      //   height,
      //   blocks,
      //   owner,
      //   dropped,
      //   updated_at
      // })
      .set(data)
      .where(eq(worlds.name, data.name))
      .returning({ id: worlds.id });

    if (res.length) return true;
    return false;
  }
}
