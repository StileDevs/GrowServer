"use strict";


import { players } from "@growserver/db";
// import { worlds } from "../src/database/schemas/World";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { formatToDisplayName } from "@growserver/utils"

/**
 * @param {string} password
 */
async function hash(password: string) {
  const salt = await bcrypt.genSalt(10);

  return await bcrypt.hash(password, salt);
}

(async () => {
  const sqlite = createClient({
    url: `file:data/data.db`
  });
  const db = drizzle(sqlite);
  const dateNow = new Date().toISOString().slice(0, 19).replace("T", " ");

  // await db.delete(players);
  await db.insert(players).values([
    {
      name: "admin",
      display_name: formatToDisplayName("aDMIn", "1"),
      password: await hash("admin"),
      role: "1",
      gems: 1000,
      clothing: null,
      inventory: null,
      last_visited_worlds: null,
      created_at: dateNow,
      heart_monitors: Buffer.from(JSON.stringify(new Map<string, Array<number>>())) // intialize empty array.
    },
    {
      name: "Reimu",
      display_name: formatToDisplayName("Reimu", "2"),
      password: await hash("hakurei"),
      role: "2",
      gems: 1000,
      clothing: null,
      inventory: null,
      last_visited_worlds: null,
      created_at: dateNow,
      heart_monitors: Buffer.from(JSON.stringify(new Map<string, Array<number>>())) // intialize empty array.
    },
    {
      name: "JadlionHD",
      display_name: formatToDisplayName("JadlionHD", "1"),
      password: await hash("admin"),
      role: "1",
      gems: 1000,
      clothing: null,
      inventory: null,
      last_visited_worlds: null,
      created_at: dateNow,
      heart_monitors: Buffer.from(JSON.stringify(new Map<string, Array<number>>())) // intialize empty array.
    }
  ])
    .onConflictDoNothing(); // dont confuse the normal user with error lol
})();
