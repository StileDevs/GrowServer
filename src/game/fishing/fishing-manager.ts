import { TANK_PACKET_TYPE } from "../../constants";
import { getItem } from "../item/item-utils";
import { GameUpdatePacket } from "../packets/game-packet";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { addRoleXp } from "../quests/role-quests";
import { TileFlags } from "../world/constants";
import type { TileData } from "../world/types";
import type { World } from "../world/world";

/** Fishing rod definitions and their retail special effects. */
export interface RodDef {
  id: number;
  maxLbs: number;
  /** 1 in N chance for a gear catch, 0 = never. */
  gearChance: number;
  /** Fish stays on the line this many times longer (E-Z Rod). */
  biteWindow?: number;
  /** Catch weight bonus in percent (Goldenrod, Exquisite Anomarod). */
  sizeBonus?: number;
  /** Always lands a fish (Thanksgiving Dinner Rod). */
  alwaysFish?: boolean;
  /** Bites twice as fast (Licorice Rod). */
  fastBite?: boolean;
}

export const FISHING_RODS: Readonly<Record<number, RodDef>> = {
  2912: { id: 2912, maxLbs: 25, gearChance: 0 },
  3008: { id: 3008, maxLbs: 40, gearChance: 0, biteWindow: 2 },
  3010: { id: 3010, maxLbs: 60, gearChance: 450, fastBite: true },
  3040: { id: 3040, maxLbs: 200, gearChance: 200, sizeBonus: 25 },
  3100: { id: 3100, maxLbs: 150, gearChance: 250 },
  5740: { id: 5740, maxLbs: 90, gearChance: 350 },
  6254: { id: 6254, maxLbs: 80, gearChance: 350 },
  6256: { id: 6256, maxLbs: 120, gearChance: 300 },
  6258: { id: 6258, maxLbs: 120, gearChance: 300, sizeBonus: 10 },
  6932: { id: 6932, maxLbs: 100, gearChance: 300 },
  10262: { id: 10262, maxLbs: 220, gearChance: 150, alwaysFish: true },
};

const DEFAULT_ROD: RodDef = { id: 0, maxLbs: 25, gearChance: 0 };

/** Baits recognized by the fishing system. */
export const FISHING_BAITS: ReadonlySet<number> = new Set([
  2914, // Wiggly Worm
  3012, // Shiny Flashy Thing
  3014, // Salmon Eggs
  3016, // Fishing Fly
  3018, // Shrimp Lure
  3020, // Whizmo Gizmo
  3098, // Otherworldly Bait
  3218, // Candy Cane Bait
  3432, // Catch-of-the-Day Bait
  4246, // Minor Otherworldly Bait
  4248, // Lesser Otherworldly Bait
  5526, // Uranium Glowing Lure
  5528, // Mega-Pellet Bait
]);

/** The bait chain: fishing with one bait can return the next tier (wiki). */
const BAIT_CHAIN: Readonly<Record<number, number>> = {
  2914: 3012,
  3012: 3014,
  3014: 3016,
  3016: 3018,
  3018: 3020,
};

/** Catch pools, transcribed from GTOS world.h. */
export const FISH_BASE_IDS: readonly number[] = [
  3000, 3024, 3026, 3030, 3032, 3034, 3036, 3038, 3092, 3094, 3096, 3220, 3222, 3224, 3226, 3434, 3436, 3438, 3440,
  3450, 3452, 3454, 3456, 3458, 3460, 3544, 3550, 3620, 3746, 3814, 3820, 4958, 5100, 5448, 5450, 5538, 5542, 5548,
  5552, 5574, 5580, 7744, 8460,
];

export const GEAR_BASE_IDS: readonly number[] = [
  344, 242, 3042, 3016, 5158, 5232, 5604, 5606, 5608, 6902, 6996, 9746,
];

export const BLOCK_BASE_IDS: readonly number[] = [
  444, 242, 1522, 3016, 3810, 4658, 5530, 5602, 5614, 5624, 6328, 7002, 8964, 8966,
];

/** Items only found while fishing in an ice environment (wiki). */
export const ICE_ENVIRONMENT_IDS: readonly number[] = [
  5626, // Tiny Frozen Chunk
  5628, // Small Frozen Chunk
  5630, // Large Frozen Chunk
  8968, // Cooler Box
  5618, // Davy Jones' Chest
  5624, // Fancy Fish Wall Mount
  5602, // Ice Crust Block
  5614, // Puffer Fish Block
  5616, // Queen Conch Shell
  8252, // Sea Urchin
  3584, // Aqua Cave Crystal
  7002, // Quantum Starfish (fishing level 10)
  3020, // Whizmo Gizmo
];

/** Ice environment exclusive fish. */
export const ICE_FISH_IDS: readonly number[] = [
  5574, // Alpha Great White Shark
  3222, // Antarctic Icefish
  5548, // Absolutely Real Elephant Fish
  5552, // Cuttlefish
];

/** Items only found while fishing in a radioactive environment (wiki). */
export const RADIOACTIVE_ENVIRONMENT_IDS: readonly number[] = [
  5632, // Tiny Radioactive Bit
  5634, // Small Radioactive Bit
  5636, // Large Radioactive Bit
  8254, // Copper Block
  5620, // Radiation Block
  5622, // Radiation Sign
  5612, // Tentacle Beard
  3584, // Aqua Cave Crystal
  6988, // Primordial Ooze (fishing level 4)
  3020, // Whizmo Gizmo
];

/** Radioactive environment exclusive fish. */
export const RADIOACTIVE_FISH_IDS: readonly number[] = [
  5580, // Weird Manta Ray
];

/** Water environments created with the fishing tools. */
export type WaterEnvironment = "normal" | "ice" | "radioactive";

/** Items that turn a water tile into a special environment. */
export const HAND_DRILL = 5522;
export const NUCLEAR_DETONATOR = 5524;
export const ICE_CRUST_BLOCK = 5602;
export const URANIUM_BLOCK = 4658;
export const MEGA_PELLET_BAIT = 5528;
export const URANIUM_GLOWING_LURE = 5526;

/** Chance (10%) that an Ice Crust or Uranium block reverts to solid after a catch. */
const BLOCK_REVERT_CHANCE = 0.10;

/** How long the client has to wait for a bite before the fish escapes. */
const BITE_TIMEOUT_MS = 30_000;
/** How long the player must stay still before the bite can roll. */
const BITE_DELAY_MS = 2000;
/** How long a bite stays on the line before it is missed. */
const BITE_WINDOW_MS = 2000;
/** Tile reach of a cast (the wiki allows one block around the water). */
const CAST_RANGE = 1;
/** Fraction of the reels spent in an environment that roll its special pool when using standard bait. */
const ENVIRONMENT_CATCH_CHANCE = 0.45;
/** Chance that a catch also returns the next bait tier. */
const BAIT_CHAIN_CHANCE = 0.06;

/** Fish species attractable by each bait tier (wiki). */
export const BAIT_FISH_POOLS: Readonly<Record<number, readonly number[]>> = {
  // 2914: Wiggly Worm (smallest fish)
  2914: [3000, 3038, 3026, 3034, 3030, 3544], // Goldfish, Bass, Catfish, Mahi Mahi, Dogfish, Picasso Triggerfish
  // 3012: Shiny Flashy Thing (small to medium)
  3012: [3000, 3030, 3038, 3036, 3032, 3544, 3550, 5100], // Goldfish, Dogfish, Bass, Sunfish, Gar, Picasso Triggerfish, Axolotl, Koi Fish
  // 3014: Salmon Eggs (medium)
  3014: [3038, 3026, 3030, 3032, 3000, 3814, 3620, 5100], // Bass, Catfish, Dogfish, Gar, Goldfish, Stonefish, Pineapple Fish, Koi Fish
  // 3016: Fishing Fly (medium-large)
  3016: [3038, 3026, 3032, 3036, 3814, 3746, 3550, 3438], // Bass, Catfish, Gar, Sunfish, Stonefish, Firefin, Axolotl, Seahorse
  // 3018: Shrimp Lure (large)
  3018: [3032, 3034, 4958, 3036, 3024, 3438, 3434, 3820], // Gar, Mahi Mahi, Sand Shark, Sunfish, Whale, Seahorse, Rainbowfish, Orca
  // 3020: Whizmo Gizmo (giant / rare)
  3020: [7744, 3024, 4958, 3820, 5448, 3438, 3440, 3034, 8460], // Dragon Turtle, Whale, Sand Shark, Orca, Mr. Narwhal, Seahorse, Mutant Fish, Mahi Mahi, Clockwork Fish
  // Otherworldly baits (dark/demon)
  3098: [3092, 3094, 3096, 5542], // Skeletal Shark, Ghost Fish, Demon Angler, Double-Headed Angel-Devil Fish
  4246: [3092, 3094, 3096],
  4248: [3092, 3094, 3096, 5542],
  // 3218: Candy Cane Bait (winter)
  3218: [3222, 3224, 3226, 3220], // Antarctic Icefish, Gingerbread Fish, Swedish Fish, Neon Squid
};

/** Max fish weight (in lbs) that each bait tier attracts. */
export const BAIT_MAX_WEIGHT: Readonly<Record<number, number>> = {
  2914: 15,
  3012: 25,
  3014: 45,
  3016: 70,
  3018: 140,
  3020: 220,
  3098: 150,
  4246: 80,
  4248: 120,
  3218: 60,
};

export interface FishingSession {
  tileX: number;
  tileY: number;
  baitId: number;
  baitName: string;
  rodId: number;
  startedAt: number;
  biteAt: number;
  triggered: boolean;
  /** When the current bite appeared, for the miss window. */
  bittenAt: number;
  playerTileX: number;
  playerTileY: number;
}

/**
 * Finds the base fishing block (Ice Crust or Uranium) associated with this water tile.
 */
export function getFishingBlockTile(world: World, tileX: number, tileY: number): TileData | undefined {
  const tile = world.getTileAt(tileX, tileY) as TileData | undefined;
  if (tile && (tile.fg === ICE_CRUST_BLOCK || tile.fg === URANIUM_BLOCK)) return tile;
  const below = world.getTileAt(tileX, tileY + 1) as TileData | undefined;
  if (below && (below.fg === ICE_CRUST_BLOCK || below.fg === URANIUM_BLOCK)) return below;
  return undefined;
}

/**
 * Whether a tile is water: the water tile flag, which is how the client marks
 * liquid tiles when it serializes a world.
 */
export function isWaterTile(block: { flags: number } | null | undefined): boolean {
  return !!block && (block.flags & TileFlags.WATER) !== 0;
}

/**
 * The environment a water tile belongs to. The fishing tools mark the block
 * itself (Ice Crust / Uranium), which normally shares the tile with the water
 * placed by the Water Bucket; a water tile directly above a marked block is
 * supported too.
 */
export function environmentAt(world: World, tileX: number, tileY: number): WaterEnvironment {
  const tile = world.getTileAt(tileX, tileY) as TileData | undefined;
  if (tile?.fishingWater) return tile.fishingWater;
  const below = world.getTileAt(tileX, tileY + 1) as TileData | undefined;
  return below?.fishingWater ?? "normal";
}

/** Determines if an item is a fishing rod. */
export function isFishingRod(itemId: number): boolean {
  if (FISHING_RODS[itemId]) return true;
  return (getItem(itemId)?.name ?? "").toLowerCase().includes("rod");
}

/** Determines if an item is fishing bait. */
export function isFishingBait(itemId: number): boolean {
  return FISHING_BAITS.has(itemId);
}

/**
 * Casts bait at a water tile. The rod must be worn in the hand slot and the
 * player must stay still until the bite.
 * @returns true when the action was handled by the fishing system.
 */
export async function handleFishingCast(player: Player, world: World, itemId: number, tileX: number, tileY: number): Promise<boolean> {
  if (!isFishingBait(itemId)) return false;

  const rodId = player.inventory.clothes.hand;
  if (!isFishingRod(rodId)) {
    player.sendTextBubble("You need to be holding a Fishing Rod to use bait.", true);
    return true;
  }

  const targetTile = world.getTileAt(tileX, tileY);
  if (!isWaterTile(targetTile) || world.isSolid(tileX, tileY)) {
    player.sendTextBubble("You can only use bait on water!", true);
    return true;
  }

  const environment = environmentAt(world, tileX, tileY);
  if (itemId === MEGA_PELLET_BAIT && environment !== "ice") {
    player.sendTextBubble("Mega-Pellet Bait can only be used in an Ice fishing hole!", true);
    return true;
  }

  if (itemId === URANIUM_GLOWING_LURE && environment !== "radioactive") {
    player.sendTextBubble("Uranium Glowing Lure can only be used in Radioactive water!", true);
    return true;
  }

  const playerTileX = Math.floor(player.state.x / 32);
  const playerTileY = Math.floor(player.state.y / 32);
  if (Math.abs(playerTileX - tileX) > CAST_RANGE || Math.abs(playerTileY - tileY) > CAST_RANGE) {
    player.sendTextBubble("You need to stand right next to the water to fish!", true);
    return true;
  }

  // Using bait again while the line is out reels it in.
  if (player.fishing) {
    reelIn(player, world);
    return true;
  }

  if (!player.inventory.hasItem(itemId)) return true;
  player.removeItemInven(itemId, 1, true);

  const rod = FISHING_RODS[rodId] ?? DEFAULT_ROD;
  const minWait = rod.fastBite ? 4000 : 8000;
  const maxWait = rod.fastBite ? 9000 : 18000;
  const biteAt = Date.now() + minWait + Math.random() * (maxWait - minWait);

  player.fishing = {
    tileX,
    tileY,
    baitId: itemId,
    baitName: getItem(itemId)?.name ?? "bait",
    rodId,
    startedAt: Date.now(),
    biteAt,
    triggered: false,
    bittenAt: 0,
    playerTileX,
    playerTileY,
  };

  sendFishingAnimation(world, player.netID, tileX, tileY, 0);
  player.sendTextBubble("`wYou cast your line and wait for a bite...``");
  return true;
}

/** Rolls bites, missed bites and expiry for every angler in the world. */
export function tickFishing(world: World): void {
  const now = Date.now();
  for (const player of world.players) {
    const session = player.fishing;
    if (!session) continue;

    if (!session.triggered && now - session.startedAt > BITE_TIMEOUT_MS) {
      stopFishing(player, world, "`wThere was nothing on the line!``");
      continue;
    }

    const rod = FISHING_RODS[session.rodId] ?? DEFAULT_ROD;

    // a missed splash loses the bite, another one may come later
    if (session.triggered && now - session.bittenAt > BITE_WINDOW_MS * (rod.biteWindow ?? 1)) {
      session.triggered = false;
      session.biteAt = now + (rod.fastBite ? 4000 : 8000) + Math.random() * 5000;
      continue;
    }

    if (!session.triggered && now >= session.biteAt) {
      session.triggered = true;
      session.bittenAt = now;
      world.broadcastVariant(Variant.from("OnParticleEffect", 36, [session.tileX * 32 + 16, session.tileY * 32 + 16]));
      world.playPositioned("audio/splash.wav", player.netID);
    }
  }
}

/**
 * Sends the client's fishing animation packet. This is the `FishMoving`
 * packet: packet type 31, the `stopped_fishing` flag in byte 3 (our
 * `buildRange`) and the cast tile at offsets 44/48. `stopped` is 0 to start
 * the animation and 2 to end it.
 */
function sendFishingAnimation(world: World, netID: number, tileX: number, tileY: number, stopped: 0 | 2): void {
  world.broadcast(
    GameUpdatePacket.create({
      type: 0x1f as unknown as TANK_PACKET_TYPE,
      buildRange: stopped,
      netID,
      tileX,
      tileY,
    }).parse()!,
  );
}

/**
 * Plays the retail catch effect: the item flies from the water to the angler
 * (`PlayerMoving` packet type 19, planting tree 500, punch payload carrying
 * the item id and the player's net ID).
 */
export function sendCatchAnimation(world: World, player: Player, itemId: number, tileX: number, tileY: number): void {
  world.broadcast(
    GameUpdatePacket.create({
      type: 19 as unknown as TANK_PACKET_TYPE,
      buildRange: 5,
      netID: player.netID,
      targetNetID: player.netID,
      itemID: 500,
      posX: tileX * 32,
      posY: tileY * 32,
      tileX: itemId,
      tileY: player.netID,
    }).parse()!,
  );
}

/**
 * Ends the cast: clears the session and tells every client to stop the
 * fishing animation, so walking away never leaves a stale fishing pose.
 */
export function stopFishing(player: Player, world?: World, message?: string): void {
  const session = player.fishing;
  if (!session) return;
  player.fishing = null;
  const activeWorld = world ?? player.world;
  if (activeWorld) sendFishingAnimation(activeWorld, player.netID, session.tileX, session.tileY, 2);
  if (message) player.sendTextBubble(message, true);
}

/**
 * A punch while the line is out always pulls the bait back in: with a bite
 * the catch is rolled, without one the bait simply returns.
 * @returns true when the punch was consumed by the fishing system.
 */
export function handleFishingPunch(player: Player, world: World): boolean {
  if (!player.fishing) return false;
  reelIn(player, world);
  return true;
}

/**
 * Checks and handles the chance for an Ice Crust or Uranium block to freeze over / revert to solid.
 */
function checkBlockRevert(world: World, tileX: number, tileY: number, player: Player): void {
  const block = getFishingBlockTile(world, tileX, tileY);
  if (!block || (block.flags & TileFlags.OPEN) === 0) return;

  if (Math.random() < BLOCK_REVERT_CHANCE) {
    // Remove OPEN and ALT_MODE, reverting to solid foreground block
    block.flags &= ~(TileFlags.OPEN | 0x0200);
    delete block.fishingWater;

    // Synchronize the reverted tile with players in world
    const { tileFrom } = require("../world/tiles");
    tileFrom(world, block).tileUpdate();
    world.markDirty();

    if (block.fg === ICE_CRUST_BLOCK) {
      world.playPositioned("audio/freeze.wav", player.netID);
      player.sendTextBubble("`4The ice hole froze over! You will need to use a Hand Drill again.``", true);
    } else {
      world.playPositioned("audio/spray.wav", player.netID);
      player.sendTextBubble("`4The radioactive water stabilized and turned solid! You will need to use a Nuclear Detonator again.``", true);
    }
  }
}

/**
 * Reels the line in. Without a bite the bait is pulled back out of the water;
 * with a bite the catch is rolled and granted.
 */
function reelIn(player: Player, world: World): void {
  const session = player.fishing;
  if (!session) return;

  if (!session.triggered) {
    stopFishing(player, world, "`wYou reeled your line back in.``");
    return;
  }

  const rod = FISHING_RODS[session.rodId] ?? DEFAULT_ROD;
  const fishLevel = player.quests.role("fishing").lvl;
  const environment = environmentAt(world, session.tileX, session.tileY);

  let caughtItem: number;
  let isFish = false;
  let count = 1;

  // Dedicated handling based on environment & bait
  if (environment === "ice") {
    if (session.baitId === MEGA_PELLET_BAIT) {
      // Mega-Pellet in Ice: 60% chance for ice fish (Alpha Great White Shark, etc.), 40% for rare ice drops
      if (Math.random() < 0.60) {
        isFish = true;
        caughtItem = pick(ICE_FISH_IDS);
      } else {
        caughtItem = pick(ICE_ENVIRONMENT_IDS);
      }
    } else if (session.baitId === 3218) {
      // Candy Cane Bait in ice: catches Antarctic Icefish or winter catch
      isFish = true;
      caughtItem = 3222; // Antarctic Icefish
    } else if (session.baitId === 2914 || session.baitId === 3012) {
      // Wiggly Worm / Shiny Flashy Thing: high chance of freezing into Tiny Frozen Chunk
      if (Math.random() < 0.50) {
        caughtItem = 5626; // Tiny Frozen Chunk
      } else {
        isFish = true;
        caughtItem = pick(FISH_BASE_IDS);
      }
    } else if (session.baitId === 3014 || session.baitId === 3016) {
      // Salmon Eggs / Fishing Fly: chance of freezing into Small Frozen Chunk
      if (Math.random() < 0.45) {
        caughtItem = 5628; // Small Frozen Chunk
      } else {
        isFish = true;
        caughtItem = pick(FISH_BASE_IDS);
      }
    } else if (session.baitId === 3018 || session.baitId === 3020) {
      // Shrimp Lure / Whizmo Gizmo: chance of Large Frozen Chunk
      if (Math.random() < 0.40) {
        caughtItem = 5630; // Large Frozen Chunk
      } else {
        isFish = true;
        caughtItem = pick(FISH_BASE_IDS);
      }
    } else if (Math.random() < ENVIRONMENT_CATCH_CHANCE) {
      caughtItem = pick(ICE_ENVIRONMENT_IDS);
    } else {
      isFish = true;
      caughtItem = pick(FISH_BASE_IDS);
    }
  } else if (environment === "radioactive") {
    if (session.baitId === URANIUM_GLOWING_LURE) {
      // Uranium Glowing Lure: 50% Weird Manta Ray, 50% rare radioactive drops (Copper Block, Tentacle Beard, etc.)
      // Note: According to GT wiki, Uranium Glowing Lure does NOT catch bits
      if (Math.random() < 0.50) {
        isFish = true;
        caughtItem = pick(RADIOACTIVE_FISH_IDS); // Weird Manta Ray
      } else {
        const withoutBits = RADIOACTIVE_ENVIRONMENT_IDS.filter(id => id !== 5632 && id !== 5634 && id !== 5636);
        caughtItem = pick(withoutBits);
      }
    } else if (session.baitId === 2914 || session.baitId === 3012) {
      // Wiggly Worm / Shiny Flashy Thing: drops Tiny Radioactive Bit
      if (Math.random() < 0.50) {
        caughtItem = 5632; // Tiny Radioactive Bit
      } else {
        isFish = true;
        caughtItem = pick(FISH_BASE_IDS);
      }
    } else if (session.baitId === 3014 || session.baitId === 3016) {
      // Salmon Eggs / Fishing Fly: drops Small Radioactive Bit
      if (Math.random() < 0.45) {
        caughtItem = 5634; // Small Radioactive Bit
      } else {
        isFish = true;
        caughtItem = pick(FISH_BASE_IDS);
      }
    } else if (session.baitId === 3018 || session.baitId === 3020) {
      // Shrimp Lure / Whizmo Gizmo: drops Large Radioactive Bit
      if (Math.random() < 0.40) {
        caughtItem = 5636; // Large Radioactive Bit
      } else {
        isFish = true;
        caughtItem = pick(FISH_BASE_IDS);
      }
    } else if (Math.random() < ENVIRONMENT_CATCH_CHANCE) {
      caughtItem = pick(RADIOACTIVE_ENVIRONMENT_IDS);
    } else {
      isFish = true;
      const pool = BAIT_FISH_POOLS[session.baitId] ?? FISH_BASE_IDS;
      caughtItem = pick(pool);
    }
  } else {
    // Normal water environment
    if (rod.gearChance > 0 && Math.floor(Math.random() * rod.gearChance) === 0) {
      caughtItem = pick(GEAR_BASE_IDS);
    } else if (!rod.alwaysFish && session.baitId === 3016 && Math.random() < 0.08) {
      caughtItem = pick(BLOCK_BASE_IDS);
    } else {
      isFish = true;
      const pool = BAIT_FISH_POOLS[session.baitId] ?? FISH_BASE_IDS;
      caughtItem = pick(pool);
    }
  }

  // Weight calculation for fish catches
  if (isFish) {
    const baitLimit = BAIT_MAX_WEIGHT[session.baitId] ?? 200;
    const effectiveMax = Math.min(rod.maxLbs, baitLimit);
    count = Math.floor(Math.random() * effectiveMax) + 1;
    if (rod.sizeBonus) count = Math.min(rod.maxLbs, Math.ceil(count * (1 + rod.sizeBonus / 100)));
    count = Math.min(rod.maxLbs, count + Math.floor(fishLevel * 0.5));
  }

  // Role perks: an infusion bonus at level 2+, a rare bonus at level 3+.
  const bonusChance = Math.min(5, Math.max(1, Math.floor(fishLevel / 2)));
  if (fishLevel >= 2 && Math.random() * 100 <= bonusChance) {
    const bonus = pick(GEAR_BASE_IDS);
    player.addItemInven(bonus, 1);
    player.variants.sendOnConsoleMessage(`Bonus catch: \`w${getItem(bonus)?.name ?? bonus}\`\``);
  } else if (fishLevel >= 3 && Math.random() * 100 <= 1) {
    player.addItemInven(260, 1);
    player.variants.sendOnConsoleMessage("Bonus catch: `wGolden Block``");
  }

  // The bait chain: a catch can return the next bait tier.
  const nextBait = BAIT_CHAIN[session.baitId];
  if (nextBait !== undefined && Math.random() < BAIT_CHAIN_CHANCE) {
    player.addItemInven(nextBait, 1);
    player.variants.sendOnConsoleMessage(`You also found \`w${getItem(nextBait)?.name ?? nextBait}\`\``);
  }

  // Gem reward scales with the weight of the catch.
  const weight = isFish ? count : 1;
  let gems = Math.floor(Math.random() * 150) + 1;
  if (weight >= 200) gems = Math.floor(Math.random() * 900) + 1;
  else if (weight >= 150) gems = Math.floor(Math.random() * 550) + 1;
  else if (weight >= 120) gems = Math.floor(Math.random() * 500) + 1;
  else if (weight >= 90) gems = Math.floor(Math.random() * 450) + 1;
  else if (weight >= 60) gems = Math.floor(Math.random() * 400) + 1;
  else if (weight >= 30) gems = Math.floor(Math.random() * 250) + 1;
  if (fishLevel >= 10 && Math.random() * 100 <= 1) gems *= 2;

  player.addGems(gems);
  addRoleXp(player, "fishing", isFish ? 2 : 5);

  // let the prize fly from the water to the angler before it lands
  sendCatchAnimation(world, player, caughtItem, session.tileX, session.tileY);

  const itemName = getItem(caughtItem)?.name ?? `item ${caughtItem}`;
  const catchText = isFish ? `${count} lb. ${itemName}` : itemName;

  if (isFish) {
    if (player.inventory.hasItem(caughtItem) || player.inventory.isFull) {
      world.drop(player, player.state.x, player.state.y + 16, caughtItem, count, { noSimilar: true, tree: true });
      player.variants.sendOnConsoleMessage(`Inventory full! Your ${count} lb. ${itemName} dropped on the floor.`);
    } else {
      player.addItemInven(caughtItem, count);
    }
  } else {
    const added = player.addItemInven(caughtItem, count);
    if (added <= 0) {
      world.drop(player, player.state.x, player.state.y + 16, caughtItem, count, { noSimilar: false, tree: true });
      player.variants.sendOnConsoleMessage(`Inventory full! Your ${count}x ${itemName} dropped on the floor.`);
    }
  }

  player.sendTextBubble(`\`wYou caught a \`2${catchText}\`w!\`\``, true);
  world.playPositioned("audio/getpoint.wav", player.netID);

  for (const other of world.players) {
    other.variants.sendOnConsoleMessage(`\`$${player.formattedName} \`ocaught \`$${catchText} \`oand got \`$${gems} \`ogems`);
  }

  const castTileX = session.tileX;
  const castTileY = session.tileY;

  stopFishing(player, world);

  // Check if ice hole or uranium block freezes over / stabilizes back to solid
  if (environment === "ice" || environment === "radioactive") {
    checkBlockRevert(world, castTileX, castTileY, player);
  }
}

/** Picks a random entry from a read-only pool. */
function pick(pool: readonly number[]): number {
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0] ?? 0;
}

/** Breaks the line when the angler walks away from the cast spot. */
export function handleFishingMovement(player: Player, world: World): void {
  const session = player.fishing;
  if (!session) return;

  const tileX = Math.floor(player.state.x / 32);
  const tileY = Math.floor(player.state.y / 32);
  if (tileX !== session.playerTileX || tileY !== session.playerTileY) {
    stopFishing(player, world, "`wSit still if you wanna fish!``");
  }
}
