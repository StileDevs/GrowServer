"use strict";

const { players } = require("../dist/database/schemas/Player");
const { worlds } = require("../dist/database/schemas/World");
const { drizzle } = require("drizzle-orm/better-sqlite3");
const DB = require("better-sqlite3");
const bcrypt = require("bcryptjs");

/**
 * @param {string} password
 */
async function hash(password) {
  const salt = await bcrypt.genSalt(10);

  return await bcrypt.hash(password, salt);
}

(async () => {
  const sqlite = new DB("./data/data.db");
  const db = drizzle(sqlite);
  const dateNow = new Date().toISOString().slice(0, 19).replace("T", " ");

  await db.delete(players);
  await db.insert(players).values([
    {
      name: "admin",
      display_name: "admin",
      password: await hash("admin"),
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
      password: await hash("hakurei"),
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
      password: await hash("admin"),
      role: "1",
      gems: 1000,
      clothing: null,
      inventory: null,
      last_visited_worlds: null,
      created_at: dateNow
    }
  ]);
})();
