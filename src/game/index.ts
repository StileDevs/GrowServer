import { serverConfig } from "../configs/server-config";
import { logger } from "../utils/logger";
import { initItems } from "./item/item-info";
import { serverManager } from "./server/server-manager";

export async function startGameServer(): Promise<void> {
  const ports = serverConfig?.game.server_ports ?? [];

  for (const port of ports) {
    serverManager.addServer(port);
  }

  await initItems();
  logger.info({ totalServers: ports.length }, "all game servers initialized");
}

export { serverManager };
export * from "./player";
export * from "./server/game-server";
export * from "./server/server-manager";
