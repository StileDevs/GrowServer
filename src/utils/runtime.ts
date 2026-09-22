import path from "path";

export interface PlatformInfo {
  os: "windows" | "mac" | "linux" | "freebsd";
  arch: "amd64" | "arm64" | "386" | "armv7" | string;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  isZip: boolean;
}

/**
 * Checks if the application is running as a compiled standalone executable (e.g. growserver.exe).
 */
export function isCompiled(): boolean {
  // 1. Virtual bundled filesystem check in Bun standalone compilation (e.g. B:/~BUN/root/... or $bunfs)
  const isVirtualFs =
    import.meta.url.includes("~BUN") ||
    import.meta.url.includes("$bunfs") ||
    (typeof Bun !== "undefined" &&
      typeof Bun.main === "string" &&
      (Bun.main.includes("~BUN") || Bun.main.includes("$bunfs")));

  if (isVirtualFs) {
    return true;
  }

  // 2. Binary process execPath check (e.g. growserver.exe vs bun.exe / node.exe)
  const binaryName = path.basename(process.execPath).toLowerCase();
  return (
    !binaryName.startsWith("bun") &&
    !binaryName.startsWith("node") &&
    !binaryName.startsWith("npx") &&
    !binaryName.startsWith("npm")
  );
}

/**
 * Checks if the application is running directly via the Bun CLI runtime (e.g. bun run src/index.ts).
 */
export function isBunRuntime(): boolean {
  return !isCompiled();
}

/**
 * Returns the current runtime execution mode.
 */
export function getRuntimeMode(): "compiled" | "bun" {
  if (isCompiled()) return "compiled";
  return "bun";
}

/**
 * Returns normalized operating system and CPU architecture details.
 */
export function getPlatformInfo(): PlatformInfo {
  let os: "windows" | "mac" | "linux" | "freebsd" = "linux";
  let isZip = false;

  switch (process.platform) {
    case "win32":
      os = "windows";
      isZip = true;
      break;
    case "darwin":
      os = "mac";
      break;
    case "freebsd":
      os = "freebsd";
      break;
    default:
      os = "linux";
      break;
  }

  let arch = "amd64";
  switch (process.arch) {
    case "x64":
      arch = "amd64";
      break;
    case "arm64":
      arch = "arm64";
      break;
    case "ia32":
      arch = "386";
      break;
    case "arm":
      arch = "armv7";
      break;
    default:
      arch = process.arch;
      break;
  }

  return {
    os,
    arch,
    isWindows: os === "windows",
    isMac: os === "mac",
    isLinux: os === "linux",
    isZip,
  };
}
