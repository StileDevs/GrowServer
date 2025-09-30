import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import { WorldDB } from "./handlers/World";
import { PlayerDB } from "./handlers/Player";
import { ShopDB } from "./handlers/Shop";

export class Database {
  public db;
  public players;
  public worlds;
  public shop;

  constructor() {
    const sqlite = createClient({
      url: `file:data/data.db`
    });
    this.db = drizzle(sqlite, { logger: false });

    this.players = new PlayerDB(this.db);
    this.worlds = new WorldDB(this.db);
    this.shop = new ShopDB(this.db);
  }
}
