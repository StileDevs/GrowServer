import { logger } from "../utils/logger";
import { tickCooking } from "./cooking/cooking-manager";
import { tickFishing } from "./fishing/fishing-manager";
import { tickGeiger } from "./geiger/geiger-manager";
import { serverManager } from "./server/server-manager";
import { tickMagplantRemotes } from "./world/magplant";
import { tickFishTraining } from "./world/tiles/training-port-tile";
import { worldManager } from "./world/world-manager";

export const FAST_TICK_MS = 200;
export const SLOW_TICK_MS = 1000;

let fastTimer: ReturnType<typeof setInterval> | null = null;
let slowTimer: ReturnType<typeof setInterval> | null = null;

/** Updates proximity mechanics independently of incoming movement packets. */
export function runFastTick(): void {
  for (const player of serverManager.players.values()) {
    if (!player.world || player.netID === 0) continue;
    try {
      tickGeiger(player);
    } catch (err) {
      logger.error({ err, id: player.id }, "geiger tick failed");
    }
  }
}

/** Advances timed mechanics once per second, isolating failures per mechanic. */
export function runSlowTick(): void {
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
  try {
    tickMagplantRemotes();
  } catch (err) {
    logger.error({ err }, "magplant remote tick failed");
  }
}

/** Starts one pair of server-wide timers across all game server ports. */
export function startServerTicks(): void {
  if (fastTimer === null) fastTimer = setInterval(runFastTick, FAST_TICK_MS);
  if (slowTimer === null) slowTimer = setInterval(runSlowTick, SLOW_TICK_MS);
}

/** Stops both timers before players and worlds are saved during shutdown. */
export function stopServerTicks(): void {
  if (fastTimer !== null) clearInterval(fastTimer);
  if (slowTimer !== null) clearInterval(slowTimer);
  fastTimer = null;
  slowTimer = null;
}
