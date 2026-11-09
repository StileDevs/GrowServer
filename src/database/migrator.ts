import { Migrator } from "kysely/migration";
import { db } from "./db";
import { migrations } from "./migrations";
import { logger } from "../utils/logger";

/**
 * Execute all pending database migrations to the latest version.
 */
export async function runMigrations(): Promise<void> {
  const startTime = performance.now();

  const migrator = new Migrator({
    db,
    provider: {
      async getMigrations() {
        return migrations;
      },
    },
  });

  const { error, results } = await migrator.migrateToLatest();
  const elapsedMs = (performance.now() - startTime).toFixed(2);

  const executedCount = results?.filter((it) => it.status === "Success").length ?? 0;

  results?.forEach((it) => {
    if (it.status === "Success") {
      logger.info({ migration: it.migrationName }, "database migration executed successfully");
    } else if (it.status === "Error") {
      logger.error({ migration: it.migrationName }, "failed to execute database migration");
    }
  });

  if (error) {
    logger.error({ err: error, elapsed: `${elapsedMs}ms` }, "database migration failed");
    throw error;
  }

  if (executedCount > 0) {
    logger.info({ count: executedCount, elapsed: `${elapsedMs}ms` }, "database initialized and migrated");
  } else {
    logger.info({ elapsed: `${elapsedMs}ms` }, "database schema up to date");
  }
}

if (import.meta.main) {
  runMigrations()
    .then(async () => {
      await db.destroy();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err }, "migration process exited with error");
      await db.destroy();
      process.exit(1);
    });
}
