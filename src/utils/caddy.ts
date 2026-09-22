import { exec, execSync, spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { EMBEDDED_CONFIGS, type EmbeddedConfigName } from "../resources";
import { getPlatformInfo } from "./runtime";
import { logger } from "./logger";

const execAsync = promisify(exec);

export interface CaddyStatus {
  exists: boolean;
  path?: string;
  source?: "local" | "system";
  version?: string;
}

/**
 * Returns the expected Caddy binary filename based on the host OS.
 */
export function getCaddyBinaryName(): string {
  return process.platform === "win32" ? "caddy.exe" : "caddy";
}

/**
 * Returns the absolute path to the local cached Caddy binary in .cache/bin/.
 */
export function getLocalCaddyPath(): string {
  return path.resolve(process.cwd(), ".cache", "bin", getCaddyBinaryName());
}

/**
 * Resolves Caddy binary location with priority:
 * 1. Local project cache: .cache/bin/caddy(.exe)
 * 2. System PATH: caddy
 */
export async function resolveCaddy(): Promise<CaddyStatus> {
  const localPath = getLocalCaddyPath();

  // 1. Check local .cache/bin/ binary
  try {
    await fs.access(localPath);
    const { stdout } = await execAsync(`"${localPath}" version`);
    const version = stdout.trim().split(" ")[0] || stdout.trim();
    return {
      exists: true,
      path: localPath,
      source: "local",
      version,
    };
  } catch {
    // Not found in local cache
  }

  // 2. Check system PATH
  try {
    const lookupCmd = process.platform === "win32" ? "where.exe caddy" : "which caddy";
    let resolvedPath = "caddy";
    try {
      const { stdout: binPathRaw } = await execAsync(lookupCmd);
      resolvedPath = binPathRaw.trim().split(/\r?\n/)[0]?.trim() || "caddy";
    } catch {}

    const { stdout } = await execAsync(`"${resolvedPath}" version`);
    const version = stdout.trim().split(" ")[0] || stdout.trim();
    return {
      exists: true,
      path: resolvedPath,
      source: "system",
      version,
    };
  } catch {
    // Not found in system PATH
  }

  return {
    exists: false,
  };
}

/**
 * Downloads and extracts the official Caddy binary into .cache/bin/.
 */
export async function downloadCaddy(): Promise<string> {
  const targetDir = path.resolve(process.cwd(), ".cache", "bin");
  await fs.mkdir(targetDir, { recursive: true });

  const binaryName = getCaddyBinaryName();
  const targetBinaryPath = path.join(targetDir, binaryName);
  const { os, arch, isZip } = getPlatformInfo();

  logger.info({ os, arch }, "fetching caddy release information from github");

  let downloadUrl = "";
  const ext = isZip ? "zip" : "tar.gz";

  try {
    const res = await fetch("https://api.github.com/repos/caddyserver/caddy/releases/latest", {
      headers: { "User-Agent": "GrowServer-Caddy-Downloader" },
    });

    if (res.ok) {
      const release = (await res.json()) as {
        tag_name: string;
        assets: Array<{ name: string; browser_download_url: string }>;
      };
      const expectedAssetName = `_${os}_${arch}.${ext}`;
      const matchingAsset = release.assets.find((a) => a.name.includes(expectedAssetName));

      if (matchingAsset) {
        downloadUrl = matchingAsset.browser_download_url;
      }
    }
  } catch (error) {
    logger.warn({ error: String(error) }, "failed to fetch latest caddy release metadata from github api, falling back to direct url");
  }

  // Fallback to stable version direct URL if GitHub API failed or rate-limited
  if (!downloadUrl) {
    const fallbackVersion = "2.11.4";
    downloadUrl = `https://github.com/caddyserver/caddy/releases/download/v${fallbackVersion}/caddy_${fallbackVersion}_${os}_${arch}.${ext}`;
  }

  logger.info({ downloadUrl }, "downloading caddy binary archive");

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Caddy from ${downloadUrl}: HTTP ${response.status} ${response.statusText}`);
  }

  const archiveBuffer = Buffer.from(await response.arrayBuffer());
  const archivePath = path.join(targetDir, `caddy_download_temp.${ext}`);

  await fs.writeFile(archivePath, archiveBuffer);

  try {
    // Extract archive into targetDir
    if (isZip) {
      // Try tar first (available on modern Windows 10/11 & Linux/macOS)
      try {
        await execAsync(`tar -xf "${archivePath}" -C "${targetDir}" ${binaryName}`);
      } catch {
        // Fallback to PowerShell Expand-Archive on Windows
        await execAsync(
          `powershell -NoProfile -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${targetDir}' -Force"`
        );
      }
    } else {
      await execAsync(`tar -xzf "${archivePath}" -C "${targetDir}" ${binaryName}`);
    }
  } finally {
    await fs.unlink(archivePath).catch(() => {});
  }

  // Grant executable permissions on Unix
  if (process.platform !== "win32") {
    await fs.chmod(targetBinaryPath, 0o755).catch(() => {});
  }

  // Verify downloaded binary
  const { stdout } = await execAsync(`"${targetBinaryPath}" version`);
  logger.info({ version: stdout.trim(), path: targetBinaryPath }, "caddy downloaded and verified successfully");

  return targetBinaryPath;
}

/**
 * Auto-generates default Caddy configuration files in configs/caddy/ if they do not exist.
 */
export async function autoGenerateCaddyfiles(): Promise<void> {
  const configsDir = path.resolve(process.cwd(), "configs", "caddy");
  await fs.mkdir(configsDir, { recursive: true });

  for (const name of ["Caddyfile.dev", "Caddyfile"] as const) {
    const filePath = path.resolve(configsDir, name);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, EMBEDDED_CONFIGS[name] ?? "", "utf8");
      logger.info({ path: filePath, target: name }, "auto-generated default caddy configuration");
    }
  }
}

/**
 * Ensures a Caddy configuration file exists in configs/caddy/<filename> and is ready for use.
 * If the file does not exist, it automatically generates it from the embedded default template.
 * If the file exists, it loads its content and overrides the in-memory EMBEDDED_CONFIGS.
 */
export async function ensureCaddyfile(filename: EmbeddedConfigName = "Caddyfile.dev"): Promise<string> {
  const primaryPath = path.resolve(process.cwd(), "configs", "caddy", filename);
  const binaryAdjacentPath = path.resolve(path.dirname(process.execPath), "configs", "caddy", filename);

  // 1. Check if already exists in primary path or adjacent to executable
  for (const candidatePath of [primaryPath, binaryAdjacentPath]) {
    try {
      const stats = await fs.stat(candidatePath);
      if (stats.isFile()) {
        const localContent = await fs.readFile(candidatePath, "utf-8");
        EMBEDDED_CONFIGS[filename] = localContent;
        logger.info({ path: candidatePath, target: filename }, "loaded caddy configuration from configs/caddy");
        return candidatePath;
      }
    } catch {}
  }

  // 2. Auto-generate file in configs/caddy/<filename> using embedded template
  await fs.mkdir(path.dirname(primaryPath), { recursive: true });
  await fs.writeFile(primaryPath, EMBEDDED_CONFIGS[filename] ?? "", "utf8");
  logger.info({ path: primaryPath, target: filename }, "auto-generated default caddy configuration");
  return primaryPath;
}

let activeCaddyProcess: ChildProcess | null = null;

/**
 * Terminates any existing Caddy instance that might be running (e.g. from a prior crashed session).
 */
export async function stopExistingCaddy(): Promise<void> {
  // 1. Attempt graceful shutdown via Caddy admin API
  try {
    await fetch("http://127.0.0.1:2019/stop", {
      method: "POST",
      signal: AbortSignal.timeout(600),
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
  } catch {
    // Admin endpoint unreachable or not running
  }

  // 2. On Windows, ensure any orphaned caddy.exe processes are terminated
  if (process.platform === "win32") {
    try {
      execSync("taskkill /f /im caddy.exe", { stdio: "ignore" });
    } catch {
      // Process not running
    }
  }
}

/**
 * Gracefully terminates the running Caddy subprocess if active.
 */
export function stopCaddy(): void {
  if (activeCaddyProcess && !activeCaddyProcess.killed) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /pid ${activeCaddyProcess.pid} /t /f`, { stdio: "ignore" });
      } else {
        activeCaddyProcess.kill("SIGTERM");
      }
    } catch {}
    activeCaddyProcess = null;
  }
}

/**
 * Spawns Caddy process with the specified Caddyfile and tracks process lifecycle.
 */
export function spawnCaddy(configPath: string, caddyExecutablePath: string = "caddy"): ChildProcess {
  logger.info({ config: configPath, executable: caddyExecutablePath }, "spawning caddy reverse proxy process");

  const proc = spawn(caddyExecutablePath, ["run", "--config", configPath], {
    stdio: "inherit",
    windowsHide: true,
  });

  activeCaddyProcess = proc;

  proc.on("error", (err) => {
    logger.error({ error: err.message }, "caddy process error");
  });

  proc.on("exit", () => {
    if (activeCaddyProcess === proc) {
      activeCaddyProcess = null;
    }
  });

  return proc;
}

