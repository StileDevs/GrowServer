import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schemas from "./shared/schemas/";

import { WorldDB } from "./handlers/World";
import { PlayerDB } from "./handlers/Player";
import { setupSeeds } from "./scripts/seeds";
import { authConfig } from "./auth";

export class Database {
  public db: PostgresJsDatabase<Record<string, never>>;
  public players;
  public worlds;
  public auth;

  constructor() {
    const connection = postgres(process.env.DATABASE_URL!);
    this.db = drizzle(connection, { logger: false });
    this.auth = betterAuth(Object.assign({
      database: drizzleAdapter(drizzle({
        client: postgres(process.env.DATABASE_URL!) 
      }),
      {
        provider: "pg",
        schema:   {
          ...schemas
        }
      }),
    }, authConfig));


    this.players = new PlayerDB(this.db);
    this.worlds = new WorldDB(this.db);
  }

  public async setup() {
    await setupSeeds();
  }
}
