/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("users", (tb) => {
    tb.increments("id_user").primary().notNullable();
    tb.string("name", 255).notNullable();
    tb.string("password", 255).notNullable();
    tb.string("role", 255).notNullable();
    tb.integer("gems", 11).nullable();
    tb.binary("clothing").nullable();
    tb.binary("inventory").nullable();
    tb.timestamp("created_at", { useTz: false }).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("users");
};
