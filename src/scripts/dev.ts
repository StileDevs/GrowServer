import { spawn, type ChildProcess } from "child_process";
import { ensureTlsCertificate } from "../utils/tls";
import { HTTPS } from "../constants";
import { ensureCaddyfile, resolveCaddy, stopExistingCaddy } from "../utils/caddy";
import { logger } from "../utils/logger";

let appProcess: ChildProcess | null = null;
let isShuttingDown = false;

/**
 * Cleanly stops both the game server and background Caddy daemon.
 */
async function cleanup(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("stopping development server and background caddy...");

  if (appProcess && !appProcess.killed) {
    appProcess.kill("SIGTERM");
    appProcess = null;
  }

  await stopExistingCaddy();
  process.exit(0);
}

/**
 * Starts Caddy in background as a daemon and launches the game server with file watch mode.
 */
async function startDev(): Promise<void> {
  // 1. Ensure TLS certificates and Caddyfile are ready
  await ensureTlsCertificate(HTTPS.TLS_CERT_PATH, HTTPS.TLS_KEY_PATH);
  const caddyfilePath = await ensureCaddyfile("Caddyfile.dev");

  // 2. Start Caddy in background (daemon mode)
  const caddy = await resolveCaddy();
  if (caddy.exists && caddy.path) {
    await stopExistingCaddy();
    logger.info({ path: caddy.path, config: caddyfilePath }, "starting caddy in background for development");

    const caddyProc = spawn(caddy.path, ["start", "--config", caddyfilePath], {
      stdio: "ignore",
      windowsHide: true,
    });

    await new Promise<void>((resolve) => {
      caddyProc.on("exit", () => resolve());
      caddyProc.on("error", () => resolve());
    });
  } else {
    logger.warn(
      { hint: "run with --with-caddy or install globally via winget install CaddyServer.Caddy" },
      "caddy web server is not installed",
    );
  }

  // 3. Register graceful shutdown hooks
  process.on("SIGINT", () => cleanup());
  process.on("SIGTERM", () => cleanup());
  process.on("exit", () => {
    stopExistingCaddy();
  });

  // 4. Launch main game server in watch mode directly connected to the terminal
  appProcess = spawn("bun", ["run", "--watch", "src/index.ts"], {
    stdio: "inherit",
  });

  appProcess.on("exit", async (code) => {
    await cleanup();
    process.exit(code ?? 0);
  });
}

startDev().catch(async (err) => {
  logger.error({ error: err instanceof Error ? err.message : String(err) }, "error running dev server");
  await cleanup();
});
