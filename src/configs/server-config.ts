import { TOML } from "bun";
import { readFile, writeFile, access, mkdir } from "fs/promises";
import { constants } from "fs";
import { join, dirname } from "path";
import { logger } from "../utils/logger";

export interface ServerConfig {
  server?:
    | {
        host?: string | undefined;
        login_domain?: string | undefined;
      }
    | undefined;
  game: {
    server_ports: number[];
    switch_sub_server_ip?: string | undefined;
    default_cdn_server?: string | undefined;
    cdn_server?: string | undefined;
    cdn_server_path?: string | undefined;
  };
}

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  server: {
    host: "127.0.0.1",
    login_domain: "login.growserver.test",
  },
  game: {
    server_ports: [17091],
    switch_sub_server_ip: "127.0.0.1",
    default_cdn_server: "growserver-cache.netlify.app",
    cdn_server: "cdn.growserver.test",
    cdn_server_path: "growtopia/",
  },
};

const DEFAULT_TOML_CONTENT = `# GrowServer Configuration File

[server]
  # Public server address (IP or domain). In development, 127.0.0.1 is used automatically. Or use 0.0.0.0 to listen on all network interfaces.
  host = "127.0.0.1"

  # Domain for the login server.
  login_domain = "login.growserver.test"


[game]
  # Multi-server port listeners (e.g. 17091, 17092)
  server_ports = [17091]

  # When switching server on sub-server, it will using this IP as using 0.0.0.0 will not work. or you could use local ip 192.168.x.x that obtained from ipconfig.
  switch_sub_server_ip = "127.0.0.1"

  # Default CDN Server, serves static content for the game. And also as a fallback server if the cdn_server is not available.
  default_cdn_server = "growserver-cache.netlify.app"

  # Custom CDN Server, host your custom static content for the game. If some file doesnt exist, the default_cdn_server will be used as a fallback.
  cdn_server = "cdn.growserver.test"

  # Where it stores the CDN server content.
  cdn_server_path = "growtopia/"
`;

let serverConfig: ServerConfig = DEFAULT_SERVER_CONFIG;
let isConfigLoaded = false;

/**
 * Checks if the current environment is development.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.APP_ENV !== "production";
}

/**
 * Resolves the server host address for game clients.
 * In development, returns "127.0.0.1" to avoid remote network binding issues.
 */
export function getServerAddress(): string {
  if (isDevelopment()) {
    return "127.0.0.1";
  }
  return serverConfig?.server?.host || "127.0.0.1";
}

/**
 * Resolves the login domain for game clients.
 */
export function getLoginDomain(): string {
  return serverConfig?.server?.login_domain || "login.growserver.test";
}

/**
 * Checks if a file exists and is readable.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the configuration file path (checking configs/server.toml first, then server.toml).
 */
async function resolveServerConfigPath(): Promise<string> {
  const possiblePaths = [
    join("configs", "server.toml"),
    join(process.cwd(), "configs", "server.toml"),
    "server.toml",
    join(process.cwd(), "server.toml"),
    join(dirname(process.execPath), "configs", "server.toml"),
    join(dirname(process.execPath), "server.toml"),
  ];

  for (const path of possiblePaths) {
    if (await fileExists(path)) {
      return path;
    }
  }

  return join("configs", "server.toml");
}

/**
 * Loads server configuration from TOML file.
 * If configs/server.toml (or server.toml) does not exist, a new default one is automatically generated in configs/server.toml.
 */
export async function loadServerConfig(): Promise<ServerConfig> {
  if (isConfigLoaded) return serverConfig;

  try {
    const configPath = await resolveServerConfigPath();
    const exists = await fileExists(configPath);

    if (!exists) {
      const parentDir = dirname(configPath);
      if (parentDir && parentDir !== ".") {
        await mkdir(parentDir, { recursive: true });
      }

      await writeFile(configPath, DEFAULT_TOML_CONTENT, "utf-8");
      logger.info({ path: configPath }, "default server.toml generated");
      serverConfig = DEFAULT_SERVER_CONFIG;
      isConfigLoaded = true;
      return serverConfig;
    }

    const configFile = await readFile(configPath, "utf-8");
    const parsed = TOML.parse(configFile.toString()) as Record<string, unknown>;

    const serverObj = (parsed["server"] as Record<string, unknown>) || {};
    const host = typeof serverObj["host"] === "string" ? serverObj["host"].trim() : "127.0.0.1";
    const loginDomain =
      typeof serverObj["login_domain"] === "string" && serverObj["login_domain"].trim()
        ? serverObj["login_domain"].trim()
        : DEFAULT_SERVER_CONFIG.server?.login_domain || "login.growserver.test";

    const gameObj = (parsed["game"] as Record<string, unknown>) || {};
    const rawPorts = gameObj["server_ports"];

    const serverPorts: number[] = Array.isArray(rawPorts) ? rawPorts.map((p) => Number(p)).filter((p) => Number.isInteger(p) && p > 0 && p <= 65535) : [17091];

    const switchSubServerIp =
      typeof gameObj["switch_sub_server_ip"] === "string" && gameObj["switch_sub_server_ip"].trim()
        ? gameObj["switch_sub_server_ip"].trim()
        : DEFAULT_SERVER_CONFIG.game.switch_sub_server_ip;

    const defaultCdnServer =
      typeof gameObj["default_cdn_server"] === "string" && gameObj["default_cdn_server"].trim()
        ? gameObj["default_cdn_server"].trim()
        : DEFAULT_SERVER_CONFIG.game.default_cdn_server;

    const cdnServer =
      typeof gameObj["cdn_server"] === "string" && gameObj["cdn_server"].trim() ? gameObj["cdn_server"].trim() : DEFAULT_SERVER_CONFIG.game.cdn_server;

    const cdnServerPath =
      typeof gameObj["cdn_server_path"] === "string" && gameObj["cdn_server_path"].trim()
        ? gameObj["cdn_server_path"].trim()
        : DEFAULT_SERVER_CONFIG.game.cdn_server_path;

    const loadedConfig: ServerConfig = {
      server: {
        host: host || "127.0.0.1",
        login_domain: loginDomain,
      },
      game: {
        server_ports: serverPorts.length > 0 ? serverPorts : [17091],
        switch_sub_server_ip: switchSubServerIp,
        default_cdn_server: defaultCdnServer,
        cdn_server: cdnServer,
        cdn_server_path: cdnServerPath,
      },
    };

    serverConfig = loadedConfig;
    isConfigLoaded = true;
    return loadedConfig;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "failed to load server config");
    throw new Error("Failed to load server config: " + error);
  }
}

export { serverConfig };
