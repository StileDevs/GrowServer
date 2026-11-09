import { spawn, execSync, type ChildProcess } from "child_process";
import { resolveCaddy, stopExistingCaddy } from "../utils/caddy";
import { logger } from "../utils/logger";

let runningProc: ChildProcess | null = null;
let isStopping = false;

/**
 * Cleanly terminates the spawned Caddy subprocess.
 */
function terminateCaddyProcess(): void {
  if (isStopping) return;
  isStopping = true;

  if (runningProc && !runningProc.killed && runningProc.pid) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /pid ${runningProc.pid} /t /f`, { stdio: "ignore" });
      } else {
        runningProc.kill("SIGTERM");
      }
    } catch {}
    runningProc = null;
  }
}

/**
 * Runner wrapper that locates Caddy (local .cache/bin/ or system PATH) and runs it.
 */
async function main() {
  const caddy = await resolveCaddy();
  if (!caddy.exists || !caddy.path) {
    logger.warn(
      { hint: "run with --with-caddy or install globally via winget install CaddyServer.Caddy" },
      "caddy web server is not installed",
    );
    process.exit(1);
  }

  // Ensure any previous lingering Caddy instance is stopped before starting
  await stopExistingCaddy();

  const args = process.argv.slice(2);
  const proc = spawn(caddy.path, args, {
    stdio: "inherit",
    windowsHide: true,
  });

  runningProc = proc;

  proc.on("error", (err) => {
    logger.error({ error: err.message }, "caddy process failed to start");
    process.exit(1);
  });

  proc.on("exit", (code) => {
    runningProc = null;
    process.exit(code ?? 0);
  });
}

// Register process listeners for graceful shutdown on Ctrl+C and exit
process.on("SIGINT", () => {
  terminateCaddyProcess();
  process.exit(0);
});

process.on("SIGTERM", () => {
  terminateCaddyProcess();
  process.exit(0);
});

process.on("SIGBREAK", () => {
  terminateCaddyProcess();
  process.exit(0);
});

process.on("exit", () => {
  terminateCaddyProcess();
});

if (import.meta.main) {
  main().catch((err) => {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "caddy runner encountered an error");
    terminateCaddyProcess();
    process.exit(1);
  });
}
