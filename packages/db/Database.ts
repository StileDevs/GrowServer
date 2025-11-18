import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";

import { WorldDB } from "./handlers/World";
import { PlayerDB } from "./handlers/Player";
import { setupSeeds } from "./scripts/seeds";
import { normalizedPath } from ".";

export class Database {
  public db;
  public players;
  public worlds;

  constructor() {
    // TODO: i guess we need to move into connection database type instead of local now since it wont read absolute path for some reason.
    const sqlite = createClient({
      url: `file:${normalizedPath}`,
    });
    this.db = drizzle(sqlite, { logger: true });

    this.players = new PlayerDB(this.db);
    this.worlds = new WorldDB(this.db);
  }

  public async setup() {

    await setupSeeds();
  }
}
