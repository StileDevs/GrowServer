const { encrypt } = require("../scripts/crypto");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("users").del();
  await knex("users").insert([
    {
      name: "admin",
      password: encrypt("admin"),
      role: "1",
      gems: 1000,
      clothing: null,
      inventory: null,
      created_at: null
    },
    {
      name: "admin1",
      password: encrypt("admin"),
      role: "2",
      gems: 1000,
      clothing: null,
      inventory: null,
      created_at: null
    }
  ]);
};
