import { Command } from "commander";
import { init } from "./services/wasm-init";
import { startGameServer } from "./game";
import { createHonoServer } from "./services/https-server";
import { createLoginServer } from "./services/login-server";
import { createCdnServer } from "./services/cdn-server";
import { logger } from "./utils/logger";
import { loadServerConfig } from "./configs/server-config";
import { runMigrations } from "./database";
import { ensureTlsCertificate } from "./utils/tls";
import { HTTPS } from "./constants";
import { resolveCaddy, ensureCaddyfile, spawnCaddy, stopCaddy, stopExistingCaddy } from "./utils/caddy";
import { db } from "./database/db";
import { runSetup, isInitialSetupNeeded } from "./scripts/setup";
import { runDoctor } from "./scripts/doctor";
import { buildItemsInfo } from "./scripts/generate-wiki";
import { serverConsole } from "./cli/console";

let isShuttingDown = false;

/**
 * Registers global process listeners to ensure clean shutdown on Ctrl+C (SIGINT) and SIGTERM.
 */
function setupGracefulShutdown(): void {
  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, "received shutdown signal, stopping growserver...");

    // Stop console interface
    serverConsole.stop();

    // Stop Caddy reverse proxy subprocess if running
    stopCaddy();

    // Close database pool connections
    try {
      await db.destroy();
      logger.info("database connections closed");
    } catch {}

    logger.info("growserver gracefully stopped");
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("exit", () => {
    serverConsole.stop();
    stopCaddy();
  });
}

/**
 * Starts the main game server, login portal, and HTTP endpoints.
 */
async function startServer(): Promise<void> {
  setupGracefulShutdown();

  try {
    if (await isInitialSetupNeeded()) {
      logger.info("clean environment detected, executing first-time setup");
      await runSetup({ skipWiki: false, destroyDbOnFinish: false });
    } else {
      // Initialize & migrate database
      await runMigrations();
    }

    // Initialize WASM and ensure config is loaded
    await init();
    await loadServerConfig();

    // Loads servers
    await createHonoServer();
    await createLoginServer();
    await createCdnServer();
    await startGameServer();

    logger.info("server ready to use");
    serverConsole.start();
  } catch (err) {
    const errorDetails =
      err instanceof Error ? { message: err.message, stack: err.stack } : { error: String(err) };
    logger.error(errorDetails, "failed to start server");
    process.exit(1);
  }
}

/**
 * Starts the game server together with Caddy reverse proxy for local development.
 */
async function startLocalServer(): Promise<void> {
  setupGracefulShutdown();

  try {
    if (await isInitialSetupNeeded()) {
      logger.info("clean environment detected, executing first-time setup");
      await runSetup({ skipWiki: false, destroyDbOnFinish: false });
    }

    // 1. Ensure TLS certificates exist before Caddy starts
    await ensureTlsCertificate(HTTPS.TLS_CERT_PATH, HTTPS.TLS_KEY_PATH);

    // 2. Ensure Caddyfile.dev is available (from disk or embedded)
    const caddyfilePath = await ensureCaddyfile("Caddyfile.dev");

    // 3. Resolve & start Caddy reverse proxy
    const caddy = await resolveCaddy();
    if (caddy.exists && caddy.path) {
      await stopExistingCaddy();
      logger.info({ path: caddy.path, config: caddyfilePath }, "launching caddy reverse proxy for local development");
      spawnCaddy(caddyfilePath, caddy.path);
    } else {
      logger.warn(
        { hint: "run bun run setup --with-caddy or install globally via winget install CaddyServer.Caddy" },
        "caddy web server is not installed",
      );
    }

    // 4. Start main server
    await startServer();
  } catch (err) {
    const errorDetails =
      err instanceof Error ? { message: err.message, stack: err.stack } : { error: String(err) };
    logger.error(errorDetails, "failed to start local server with caddy");
    process.exit(1);
  }
}

const program = new Command();

program
  .name("growserver")
  .description("GrowServer - A Growtopia Private Server built with Bun & TypeScript")
  .version("4.0.0");

// Default command: start server
program
  .command("start", { isDefault: true })
  .description("Start the GrowServer game, HTTP, and login servers")
  .action(async () => {
    await startServer();
  });

// Start local development server with Caddy reverse proxy
program
  .command("start:local")
  .description("Start the GrowServer game server with Caddy reverse proxy (Caddyfile.dev) for local development")
  .action(async () => {
    await startLocalServer();
  });

// Setup command
program
  .command("setup")
  .description("Run complete server setup (TLS, config, migrations, items.dat, wiki.json)")
  .option("--skip-wiki", "Skip scraping wiki metadata during setup")
  .option("--with-caddy", "Download Caddy web server into .cache/bin/ for local HTTPS reverse proxy")
  .action(async (options: { skipWiki?: boolean; withCaddy?: boolean }) => {
    await runSetup({ skipWiki: options.skipWiki, withCaddy: options.withCaddy });
  });

// Doctor command
program
  .command("doctor")
  .description("Check system dependencies and environment requirements")
  .action(async () => {
    await runDoctor();
  });

// Migrate command
program
  .command("migrate")
  .alias("migrate:latest")
  .description("Run pending database migrations to data/local.db")
  .action(async () => {
    await runMigrations();
  });

// Wiki generator command
program
  .command("wiki")
  .alias("generate:wiki")
  .description("Scrape Growtopia Wiki and generate .cache/wiki.json")
  .action(async () => {
    await buildItemsInfo();
  });

await program.parseAsync(process.argv);
