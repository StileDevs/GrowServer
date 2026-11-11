import { logger } from "../utils/logger";
import { tickCooking } from "./cooking/cooking-manager";
import { tickFishing } from "./fishing/fishing-manager";
import { tickGeiger } from "./geiger/geiger-manager";
import { serverManager } from "./server/server-manager";
import { tickMagplantRemotes } from "./world/magplant";
import { tickFishTraining } from "./world/tiles/training-port-tile";
import { worldManager } from "./world/world-manager";

export const FAST_TICK_MS = 250;
export const SLOW_TICK_MS = 1000;
const TICK_WARN_MS = 100;

let gameTickTimer: ReturnType<typeof setInterval> | null = null;
let nextSlowTickAt = 0;
let tickRunning = false;
let lastOverrunLogAt = 0;

/** Updates proximity mechanics independently of incoming movement packets. */
export function runFastTick(now = Date.now()): void {
  for (const player of serverManager.players.values()) {
    if (!player.world || player.netID === 0) continue;
    try {
      tickGeiger(player, now);
    } catch (err) {
      logger.error({ err, id: player.id }, "geiger tick failed");
    }
  }
}

/** Advances timed mechanics once per second, isolating failures per mechanic. */
export function runSlowTick(now = Date.now()): void {
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
  try {
    tickMagplantRemotes();
  } catch (err) {
    logger.error({ err }, "magplant remote tick failed");
  }
}

/** Starts the upstream scheduler: one fast timer with a gated slow phase. */
export function startServerTicks(): void {
  if (gameTickTimer !== null) return;
  nextSlowTickAt = Date.now() + SLOW_TICK_MS;
  gameTickTimer = setInterval(() => {
    if (tickRunning) return;
    tickRunning = true;
    const startedAt = performance.now();
    try {
      const now = Date.now();
      runFastTick(now);
      if (now >= nextSlowTickAt) {
        // Skip missed slow ticks instead of catching up in a burst.
        nextSlowTickAt = now + SLOW_TICK_MS;
        runSlowTick(now);
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

/** Stops the scheduler before players and worlds are saved during shutdown. */
export function stopServerTicks(): void {
  if (gameTickTimer !== null) clearInterval(gameTickTimer);
  gameTickTimer = null;
  nextSlowTickAt = 0;
  tickRunning = false;
  lastOverrunLogAt = 0;
}
