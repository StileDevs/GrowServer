"use strict";


import { players } from "../";
// import { worlds } from "../src/database/schemas/World";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { formatToDisplayName } from "@growserver/utils"
import { config } from "dotenv";

config({
  path: "../../.env"
})


/**
 * @param {string} password
 */
async function hash(password: string) {
  const salt = await bcrypt.genSalt(10);

  return await bcrypt.hash(password, salt);
}


export async function setupSeeds() {
  const connection = postgres(process.env.DATABASE_URL!);
  const db = drizzle(connection);
  const dateNow = new Date().toISOString().slice(0, 19).replace("T", " ");

  // Drop and recreate table if it exists
  await connection.unsafe(`DROP TABLE IF EXISTS players CASCADE;`);
  await connection.unsafe(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      gems INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      exp INTEGER DEFAULT 0,
      clothing TEXT,
      inventory TEXT,
      last_visited_worlds TEXT,
      created_at TEXT DEFAULT (current_timestamp),
      updated_at TEXT DEFAULT (current_timestamp),
      heart_monitors TEXT NOT NULL
    );
  `);
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
      heart_monitors: JSON.stringify({}) // intialize empty object.
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
      heart_monitors: JSON.stringify({}) // intialize empty object.
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
      heart_monitors: JSON.stringify({}) // intialize empty object.
    }
  ])
    .onConflictDoNothing(); // dont confuse the normal user with error lol

}
