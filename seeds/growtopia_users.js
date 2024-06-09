import { encrypt } from "../scripts/crypto.js";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("users").del();
  await knex("users").insert([
    {
      name: "admin",
      display_name: "admin",
      password: encrypt("admin"),
      role: "1",
      gems: 1000,
      clothing: null,
      inventory: null,
      last_visited_worlds: null,
      created_at: null
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
      created_at: null
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
      created_at: null
    }
  ]);
};

export { seed };
