import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql, like } from "drizzle-orm";
import { players } from "../shared/schemas/Player";
import bcrypt from "bcryptjs";
import { ROLE } from "@growserver/const";
import { PeerData } from "@growserver/types";

export class PlayerDB {
  constructor(private db: PostgresJsDatabase<Record<string, never>>) {}

  public async get(name: string) {
    const res = await this.db
      .select()
      .from(players)
      .where(like(players.name, name))
      .limit(1)
      .execute();

    if (res.length) return res[0];
    return undefined;
  }

  public async getByUID(userID: number) {
    const res = await this.db
      .select()
      .from(players)
      .where(eq(players.id, userID))
      .limit(1)
      .execute();

    if (res.length) return res[0];
    return undefined;
  }

  public async has(name: string) {
    const res = await this.db
      .select({ count: sql`count(*)` })
      .from(players)
      .where(like(players.name, name))
      .limit(1)
      .execute();

    return (res[0].count as number) > 0;
  }

  public async set(name: string, password: string) {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const res = await this.db
      .insert(players)
      .values({
        display_name: name,
        name: name.toLowerCase(),
        password: hashPassword,
        role: ROLE.BASIC,
        heart_monitors: JSON.stringify({}),
      })
      .returning({ id: players.id });

    if (res.length && res[0].id) return res[0].id;
    return 0;
  }

  public async save(data: PeerData) {
    if (!data.userID) return false;

    const res = await this.db
      .update(players)
      .set({
        name: data.name,
        display_name: data.displayName,
        role: data.role,
        inventory: JSON.stringify(data.inventory),
        clothing: JSON.stringify(data.clothing),
        gems: data.gems,
        level: data.level,
        exp: data.exp,
        last_visited_worlds: JSON.stringify(data.lastVisitedWorlds),
        updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
        heart_monitors: JSON.stringify(Object.fromEntries(data.heartMonitors)),
      })
      .where(eq(players.id, data.userID))
      .returning({ id: players.id });

    if (res.length) return true;
    else return false;
  }
}
