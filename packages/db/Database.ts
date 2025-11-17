import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";

import { WorldDB } from "./handlers/World";
import { PlayerDB } from "./handlers/Player";

export class Database {
  public db;
  public players;
  public worlds;

  constructor() {
    const dbPath = path.join(__dirname, "data", "data.db");
    const sqlite = createClient({
      url: `file:${dbPath}`
    });
    this.db = drizzle(sqlite, { logger: false });

    this.players = new PlayerDB(this.db);
    this.worlds = new WorldDB(this.db);
  }
}
