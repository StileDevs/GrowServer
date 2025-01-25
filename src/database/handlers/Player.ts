import { type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, sql } from "drizzle-orm";
import { players } from "../schemas/Player";
import bcrypt from "bcryptjs";
import { ROLE } from "../../Constants";
import { PeerData } from "../../types/peer";

export class PlayerDB {
  constructor(private db: LibSQLDatabase<Record<string, never>>) {}

  public async get(name: string) {
    const res = await this.db
      .select()
      .from(players)
      .where(eq(players.name, name))
      .limit(1)
      .execute();

    if (res.length) return res[0];
    return undefined;
  }

  public async has(name: string) {
    const res = await this.db
      .select({ count: sql`count(*)` })
      .from(players)
      .where(eq(players.name, name))
      .limit(1)
      .execute();

    return (res[0].count as number) > 0;
  }

  public async set(name: string, password: string) {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const res = await this.db.insert(players).values({
      display_name: name,
      name:         name.toLowerCase(),
      password:     hashPassword,
      role:         ROLE.BASIC
    });

    if (res && res.lastInsertRowid) return res.lastInsertRowid;
    return 0;
  }

  public async save(data: PeerData) {
    if (!data.id_user) return false;

    const res = await this.db
      .update(players)
      .set({
        role:                data.role,
        inventory:           Buffer.from(JSON.stringify(data.inventory)),
        clothing:            Buffer.from(JSON.stringify(data.clothing)),
        gems:                data.gems,
        level:               data.level,
        exp:                 data.exp,
        last_visited_worlds: Buffer.from(
          JSON.stringify(data.lastVisitedWorlds)
        ),
        updated_at: new Date().toISOString().slice(0, 19).replace("T", " ")
      })
      .where(eq(players.id, parseInt(data.id_user as string)))
      .returning({ id: players.id });

    if (res.length) return true;
    else return false;
  }
}
