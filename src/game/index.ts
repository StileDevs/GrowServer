import { serverConfig } from "../configs/server-config";
import { logger } from "../utils/logger";
import { initItems } from "./item/item-info";
import { loadItemsWiki } from "./item/item-wiki";
import { serverManager } from "./server/server-manager";
import { worldManager } from "./world/world-manager";
import { registerGameConsoleCommands } from "../cli/game-commands";
import { loadStoreCatalog } from "./network/store-catalog";
import { tickFishing } from "./fishing/fishing-manager";
import { tickCooking } from "./cooking/cooking-manager";
import { tickFishTraining } from "./world/tiles/training-port-tile";
import { tickMagplantRemotes } from "./world/magplant";

export async function startGameServer(): Promise<void> {
  const ports = serverConfig?.game.server_ports ?? [];

  for (const port of ports) {
    serverManager.addServer(port);
  }

  await initItems();
  await loadItemsWiki();
  loadStoreCatalog();
  registerGameConsoleCommands();
  startAutosave();
  logger.info({ totalServers: ports.length }, "all game servers initialized");
}

/** Interval between periodic saves of online players and changed worlds. */
const AUTOSAVE_INTERVAL_MS = 60_000;
let autosaveTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Saves every online player and every world with unsaved changes.
 */
export async function saveGameState(): Promise<void> {
  for (const player of serverManager.players.values()) {
    await player.saveToDatabase();
  }
  await worldManager.saveAll();
}

function startAutosave(): void {
  if (autosaveTimer) return;
  autosaveTimer = setInterval(() => {
    saveGameState().catch((err) => logger.error({ err }, "autosave failed"));
  }, AUTOSAVE_INTERVAL_MS);
  startPlayModTicker();
}

/** Interval at which timed play mods are checked for expiry. */
const PLAY_MOD_TICK_MS = 1000;
let playModTimer: ReturnType<typeof setInterval> | null = null;

function startPlayModTicker(): void {
  if (playModTimer) return;
  playModTimer = setInterval(() => {
    for (const player of serverManager.players.values()) {
      try {
        player.playMods.tick();
      } catch (err) {
        logger.error({ err, id: player.id }, "play mod tick failed");
      }
    }
    for (const world of worldManager.worlds.values()) {
      try {
        tickFishing(world);
      } catch (err) {
        logger.error({ err, world: world.name }, "fishing tick failed");
      }
      try {
        tickCooking(world);
      } catch (err) {
        logger.error({ err, world: world.name }, "cooking tick failed");
      }
      try {
        tickFishTraining(world);
      } catch (err) {
        logger.error({ err, world: world.name }, "fish training tick failed");
      }
    }
    tickMagplantRemotes();
  }, PLAY_MOD_TICK_MS);
}

/**
 * Persists every player and pending world before the process exits.
 */
export async function shutdownGameServer(): Promise<void> {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
  if (playModTimer) {
    clearInterval(playModTimer);
    playModTimer = null;
  }
  for (const player of serverManager.players.values()) {
    player.variants.sendOnConsoleMessage("`4The server is restarting.`` Please reconnect in a moment.");
    player.leaveWorld(false);
    await player.saveToDatabase();
    player.disconnectLater();
  }
  // give ENet a moment to deliver the disconnects before the sockets close
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const server of serverManager.getAllServers()) server.stop();
  await worldManager.saveAll();
}

export { serverManager, worldManager };
export * from "./player";
export * from "./server/game-server";
export * from "./server/server-manager";
export * from "./world/world";
