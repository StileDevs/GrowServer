import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { isCompiled } from "../utils/runtime";
import { resolveCaddy } from "../utils/caddy";

const execAsync = promisify(exec);

interface DoctorCheckResult {
  title: string;
  status: "ok" | "warn" | "fail";
  message: string;
  details?: string[];
  recommendation?: string[];
}

async function checkCaddy(): Promise<DoctorCheckResult> {
  const caddy = await resolveCaddy();
  if (caddy.exists) {
    const location = caddy.source === "local" ? ".cache/bin/ (local cache)" : "system PATH";
    return {
      title: "Caddy Web Server",
      status: "ok",
      message: `Installed in ${location} (${caddy.version || "detected"})`,
    };
  }

  return {
    title: "Caddy Web Server",
    status: "warn",
    message: "Not found (required for local development HTTPS reverse proxy)",
    details: [
      "Growtopia client sends login requests to https://www.growtopia1.com:443 which Caddy proxies to port 17900.",
    ],
    recommendation: [
      "Download automatically: bun run setup --with-caddy (or growserver setup --with-caddy)",
      "Windows (winget): winget install CaddyServer.Caddy",
      "Windows (Chocolatey): choco install caddy",
      "Manual binary download: https://caddyserver.com/download",
    ],
  };
}

function checkRuntime(isStandalone: boolean): DoctorCheckResult {
  if (isStandalone) {
    const bunVer = typeof Bun !== "undefined" ? `v${Bun.version}` : "embedded";
    return {
      title: "Execution Runtime",
      status: "ok",
      message: `Standalone Binary (${path.basename(process.execPath)}) [Bun ${bunVer}]`,
    };
  }
  return {
    title: "Execution Runtime",
    status: "ok",
    message: `Bun CLI Runtime (${process.execPath})`,
  };
}

async function checkDependencies(isStandalone: boolean): Promise<DoctorCheckResult> {
  if (isStandalone) {
    return {
      title: "Project Dependencies",
      status: "ok",
      message: "All assets & dependencies embedded inside executable",
    };
  }

  try {
    await fs.stat("node_modules");
    return {
      title: "Project Dependencies (node_modules)",
      status: "ok",
      message: "node_modules directory found",
    };
  } catch {
    return {
      title: "Project Dependencies (node_modules)",
      status: "fail",
      message: "node_modules directory missing",
      recommendation: ["Run 'bun install' to install dependencies."],
    };
  }
}

async function checkPackageManager(isStandalone: boolean): Promise<DoctorCheckResult> {
  if (isStandalone) {
    return {
      title: "Runtime Environment",
      status: "ok",
      message: "Self-contained executable (No external Node.js / Bun installation required)",
    };
  }

  try {
    const { stdout } = await execAsync("bun -v");
    return {
      title: "bun Package Manager",
      status: "ok",
      message: `v${stdout.trim()}`,
    };
  } catch {
    return {
      title: "bun Package Manager",
      status: "warn",
      message: "Not installed or not in PATH",
      recommendation: ["Install bun: https://bun.sh/"],
    };
  }
}

function printStatus(result: DoctorCheckResult) {
  const icon = result.status === "ok" ? "\x1b[32m[✓]\x1b[0m" : result.status === "warn" ? "\x1b[33m[!]\x1b[0m" : "\x1b[31m[✗]\x1b[0m";

  console.log(`${icon} ${result.title}: ${result.message}`);

  if (result.details) {
    for (const detail of result.details) {
      console.log(`    • ${detail}`);
    }
  }

  if (result.recommendation) {
    console.log(`    \x1b[36mHow to resolve:\x1b[0m`);
    for (const rec of result.recommendation) {
      console.log(`      - ${rec}`);
    }
  }
}

export async function runDoctor(): Promise<void> {
  console.log("\n Doctor summary (checking system requirements...)\n");

  const standalone = isCompiled();

  const results: DoctorCheckResult[] = [
    checkRuntime(standalone),
    await checkPackageManager(standalone),
    await checkDependencies(standalone),
    await checkCaddy(),
  ];

  for (const result of results) {
    printStatus(result);
    console.log("");
  }

  const hasFailures = results.some((r) => r.status === "fail");
  const hasWarnings = results.some((r) => r.status === "warn");

  console.log("--------------------------------------------------");
  if (hasFailures) {
    console.log("\x1b[31m[!] Doctor found issues that need attention.\x1b[0m\n");
  } else if (hasWarnings) {
    console.log("\x1b[33m[!] Doctor found warnings, but system is runnable.\x1b[0m\n");
  } else {
    console.log("\x1b[32m[✓] Doctor found no issues!\x1b[0m\n");
  }
}

if (import.meta.main) {
  runDoctor().catch(console.error);
}
