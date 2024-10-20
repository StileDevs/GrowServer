import { drizzle } from "drizzle-orm/better-sqlite3";
import DB from "better-sqlite3";
import { WorldDB } from "./handlers/World";
import { PlayerDB } from "./handlers/Player";

export class Database {
  public db;
  public players;
  public worlds;

  constructor() {
    const sqlite = new DB("./data/data.db");
    this.db = drizzle(sqlite);

    this.players = new PlayerDB(this.db);
    this.worlds = new WorldDB(this.db);
  }
}
