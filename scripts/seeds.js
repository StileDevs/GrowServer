"use strict";

import { encrypt } from "../scripts/crypto.js";
import { users, worlds } from "../dist/database/schemas.js";
import { drizzle } from "drizzle-orm/better-sqlite3";
import DB from "better-sqlite3";

(async () => {
  const sqlite = new DB("./data/dev.db");
  const db = drizzle(sqlite);
  const dateNow = new Date().toISOString().slice(0, 19).replace("T", " ");

  await db.delete(users);
  await db.insert(users).values([
    {
      name: "admin",
      display_name: "admin",
      password: encrypt("admin"),
      role: "1",
      gems: 1000,
      clothing: null,
      inventory: null,
      last_visited_worlds: null,
      created_at: dateNow
    },
    {
      name: "reimu",
      display_name: "Reimu",
      password: encrypt("hakurei"),
      role: "2",
      gems: 1000,
      clothing: null,
      inventory: null,
      last_visited_worlds: null,
      created_at: dateNow
    },
    {
      name: "jadlionhd",
      display_name: "JadlionHD",
      password: encrypt("admin"),
      role: "1",
      gems: 1000,
      clothing: null,
      inventory: null,
      last_visited_worlds: null,
      created_at: dateNow
    }
  ]);
})();
