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
      id_user: 1,
      name: "admin",
      password: encrypt("admin"),
      email: "justpandaever@gmail.com",
      role: "1",
      gems: 1000,
      clothing: null,
      inventory: null,
      created_at: null
    }
  ]);
};
