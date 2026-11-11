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
import { tickGeiger } from "./geiger/geiger-manager";

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
  startGameTicker();
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
}

/** Fast phase: server-pushed effects that do not depend on client input. */
const FAST_TICK_MS = 250;
/** Slow phase: economy timers, sessions and world simulation. */
const SLOW_TICK_MS = 1000;
/** Log a warning when one tick spends longer than this. */
const TICK_WARN_MS = 100;

let gameTickTimer: ReturnType<typeof setInterval> | null = null;
let nextSlowTickAt = 0;
let tickRunning = false;
let lastOverrunLogAt = 0;

function startGameTicker(): void {
  if (gameTickTimer) return;
  nextSlowTickAt = Date.now() + SLOW_TICK_MS;

  gameTickTimer = setInterval(() => {
    if (tickRunning) return;
    tickRunning = true;
    const startedAt = performance.now();

    try {
      const now = Date.now();
      tickGeigerPlayers(now);

      if (now >= nextSlowTickAt) {
        // skip missed slow ticks instead of catching up in a burst
        nextSlowTickAt = now + SLOW_TICK_MS;
        tickSlow(now);
      }
    } catch (err) {
      logger.error({ err }, "game tick failed");
    } finally {
      const elapsed = performance.now() - startedAt;
      if (elapsed > TICK_WARN_MS && Date.now() - lastOverrunLogAt >= 5000) {
        lastOverrunLogAt = Date.now();
        logger.warn({ elapsedMs: Math.round(elapsed) }, "game tick overran its budget");
      }
      tickRunning = false;
    }
  }, FAST_TICK_MS);
}

/** Fast phase: keep server-pushed effects running without client packets. */
function tickGeigerPlayers(now: number): void {
  for (const player of serverManager.players.values()) {
    if (!player.world) continue;
    try {
      tickGeiger(player, now);
    } catch (err) {
      logger.error({ err, id: player.id }, "geiger tick failed");
    }
  }
}

/** Slow phase: the existing one-second simulation. */
function tickSlow(now: number): void {
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
      tickFishTraining(world, now);
    } catch (err) {
      logger.error({ err, world: world.name }, "fish training tick failed");
    }
  }

  tickMagplantRemotes();
}

/**
 * Persists every player and pending world before the process exits.
 */
export async function shutdownGameServer(): Promise<void> {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
  if (gameTickTimer) {
    clearInterval(gameTickTimer);
    gameTickTimer = null;
  }
  nextSlowTickAt = 0;
  tickRunning = false;
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
