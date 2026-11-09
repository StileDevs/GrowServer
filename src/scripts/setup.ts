import { ensureTlsCertificate } from "../utils/tls";
import { HTTPS } from "../constants";
import { loadServerConfig } from "../configs/server-config";
import { runMigrations } from "../database/migrator";
import { initItems } from "../game/item/item-info";
import { compilePlayerTributeDat } from "../configs/player-tribute";
import { buildItemsInfo } from "./generate-wiki";
import { resolveCaddy, downloadCaddy, autoGenerateCaddyfiles } from "../utils/caddy";
import { logger } from "../utils/logger";
import { access } from "fs/promises";
import { constants } from "fs";
import path from "path";
import { db } from "../database/db";

export interface SetupOptions {
  skipWiki?: boolean | undefined;
  withCaddy?: boolean | undefined;
  destroyDbOnFinish?: boolean | undefined;
}

/**
 * Checks whether the server environment is fresh/empty and requires initial setup.
 */
export async function isInitialSetupNeeded(): Promise<boolean> {
  const checkPaths = [
    path.resolve(process.cwd(), "configs", "server.toml"),
    path.resolve(process.cwd(), "server.toml"),
  ];

  for (const p of checkPaths) {
    try {
      await access(p, constants.R_OK);
      return false;
    } catch {}
  }

  return true;
}

/**
 * Orchestrates complete initial setup for GrowServer.
 */
export async function runSetup(options: SetupOptions = {}): Promise<void> {
  const startTime = performance.now();

  try {
    // 1. Setup Server Configuration
    logger.info({ step: 1, total: 7 }, "checking server configuration");
    const config = await loadServerConfig();
    logger.info({ host: config.server?.host || "127.0.0.1", ports: config.game.server_ports }, "server configuration loaded");

    // 2. Setup TLS Self-Signed Certificates
    logger.info({ step: 2, total: 7 }, "verifying tls certificates");
    await ensureTlsCertificate(HTTPS.TLS_CERT_PATH, HTTPS.TLS_KEY_PATH);
    logger.info({ cert: HTTPS.TLS_CERT_PATH }, "tls certificates ready");

    // 3. Setup Database & Migrations
    logger.info({ step: 3, total: 7 }, "running database migrations");
    await runMigrations();
    logger.info("database schema migrated");

    // 4. Setup Player Tribute Configuration & Binary (.cache/player-tribute.dat)
    logger.info({ step: 4, total: 7 }, "compiling player tribute configuration");
    const tributeBuffer = await compilePlayerTributeDat();
    logger.info({ size: tributeBuffer.length }, "player tribute data compiled");

    // 5. Download & Verify items.dat (and load player-tribute.dat)
    logger.info({ step: 5, total: 7 }, "resolving items database");
    await initItems();
    logger.info("items database ready");

    // 6. Generate Wiki Metadata
    if (!options.skipWiki) {
      logger.info({ step: 6, total: 7 }, "generating wiki metadata");
      await buildItemsInfo();
      logger.info("wiki metadata generated");
    } else {
      logger.info({ step: 6, total: 7 }, "wiki metadata generation skipped");
    }

    // 7. Caddy Reverse Proxy Check / Auto-Download
    logger.info({ step: 7, total: 7 }, "checking caddy reverse proxy");
    await autoGenerateCaddyfiles();
    if (options.withCaddy) {
      logger.info("downloading caddy binary");
      const caddyPath = await downloadCaddy();
      logger.info({ path: caddyPath }, "caddy installed");
    } else {
      const caddy = await resolveCaddy();
      if (caddy.exists) {
        const source = caddy.source === "local" ? ".cache/bin" : "system path";
        logger.info({ source, version: caddy.version }, "caddy reverse proxy detected");
      } else {
        logger.warn(
          { hint: "run with --with-caddy or install globally via winget install CaddyServer.Caddy" },
          "caddy not detected, required for local https reverse proxy",
        );
      }
    }

    const totalElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    logger.info({ elapsed: `${totalElapsed}s` }, "setup completed successfully");
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, "setup failed");
    throw error;
  } finally {
    if (options.destroyDbOnFinish) {
      await db.destroy().catch(() => {});
    }
  }
}

if (import.meta.main) {
  const skipWiki = process.argv.includes("--skip-wiki");
  const withCaddy = process.argv.includes("--with-caddy");
  runSetup({ skipWiki, withCaddy, destroyDbOnFinish: true })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
