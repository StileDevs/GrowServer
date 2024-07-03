import type { User, PeerDataType, WorldData, WorldDB } from "../types";
import { encrypt } from "../utils/Utils.js";
import { users, worlds } from "./schemas.js";
import { drizzle } from "drizzle-orm/better-sqlite3";
import DB from "better-sqlite3";
import { eq } from "drizzle-orm";

export class Database {
  public db;

  constructor() {
    const sqlite = new DB("./data/dev.db");
    this.db = drizzle(sqlite);
  }

  public async getUser(username: string) {
    const res = await this.db.select().from(users).where(eq(users.name, username));

    if (res.length) return res[0];
    return undefined;
  }

  public async saveUser(data: PeerDataType) {
    if (!data.id_user) return;

    const res = await this.db
      .update(users)
      .set({
        role: data.role,
        inventory: Buffer.from(JSON.stringify(data.inventory)),
        clothing: Buffer.from(JSON.stringify(data.clothing)),
        gems: data.gems,
        level: data.level,
        exp: data.exp,
        last_visited_worlds: Buffer.from(JSON.stringify(data.lastVisitedWorlds)),
        updated_at: new Date().toISOString().slice(0, 19).replace("T", " ")
      })
      .where(eq(users.id, parseInt(data.id_user as string)))
      .returning({ id: users.id });

    if (res.length) return true;
    return undefined;
  }

  public async createUser(username: string, password: string) {
    const encPass = encrypt(password);

    const res = await this.db.insert(users).values({ display_name: username, name: username.toLowerCase(), password: encPass, role: "2" });

    if (res && res.lastInsertRowid) return res.lastInsertRowid;
    return undefined;
  }

  public async getWorld(name: string) {
    const res = await this.db.select().from(worlds).where(eq(worlds.name, name));

    if (res.length) return res[0];
    return undefined;
  }

  public async createWorld({ name, ownedBy = null, blockCount, blocks, width, height, owner, dropped, weather_id }: WorldDB) {
    if (!name && !blockCount && !blocks && !width && !height) return;

    const res = await this.db.insert(worlds).values({
      name: name,
      ownedBy,
      blockCount,
      width,
      height,
      blocks,
      owner,
      dropped,
      weather_id
    });

    if (res && res.lastInsertRowid) return res.lastInsertRowid;
    return undefined;
  }

  public async saveWorld({ name, ownedBy = null, blockCount, blocks, width, height, owner, dropped, updated_at }: WorldDB) {
    if (!name && !blockCount && !blocks && !width && !height) return;

    const res = await this.db
      .update(worlds)
      .set({
        ownedBy,
        blockCount,
        width,
        height,
        blocks,
        owner,
        dropped,
        updated_at
      })
      .where(eq(worlds.name, name))
      .returning({ id: worlds.id });

    if (res.length) return true;
    return undefined;
  }
}
