// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
const config = {
  development: {
    client: "better-sqlite3",
    connection: {
      filename: "./data/dev.db"
    }
  },

  staging: {
    client: "better-sqlite3",
    connection: {
      filename: "./data/staging.db"
    },
    migrations: {
      tableName: "knex_migrations"
    }
  },

  production: {
    client: "better-sqlite3",
    connection: {
      filename: "./data/production.db"
    },
    migrations: {
      tableName: "knex_migrations"
    }
  }

  // staging: {
  //   client: 'postgresql',
  //   connection: {
  //     database: 'my_db',
  //     user:     'username',
  //     password: 'password'
  //   },
  //   pool: {
  //     min: 2,
  //     max: 10
  //   },
  //   migrations: {
  //     tableName: 'knex_migrations'
  //   }
  // },

  // production: {
  //   client: 'postgresql',
  //   connection: {
  //     database: 'my_db',
  //     user:     'username',
  //     password: 'password'
  //   },
  //   pool: {
  //     min: 2,
  //     max: 10
  //   },
  //   migrations: {
  //     tableName: 'knex_migrations'
  //   }
  // }
};

export default config;
