import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { WorldDB } from "./handlers/World";
import { PlayerDB } from "./handlers/Player";
import { setupSeeds } from "./scripts/seeds";

export class Database {
  public db: PostgresJsDatabase<Record<string, never>>;
  public players;
  public worlds;

  constructor() {
    const connection = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(connection, { logger: false });

    this.players = new PlayerDB(this.db);
    this.worlds = new WorldDB(this.db);
  }

  public async setup() {
    await setupSeeds();
  }
}
