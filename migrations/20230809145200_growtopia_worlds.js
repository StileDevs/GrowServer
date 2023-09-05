/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("worlds", (tb) => {
    tb.increments("id").primary().notNullable();
    tb.string("name", 255).notNullable();
    tb.integer("ownedBy", 11).nullable();
    tb.binary("owner").nullable();
    tb.integer("width", 11).notNullable();
    tb.integer("height", 11).notNullable();
    tb.integer("blockCount", 11).notNullable();
    tb.binary("blocks").nullable();
    tb.binary("dropped").nullable();
    tb.timestamp("created_at", { useTz: false }).nullable();
    tb.timestamp("updated_at", { useTz: false }).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("worlds");
};
