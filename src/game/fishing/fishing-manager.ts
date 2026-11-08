import { TANK_PACKET_TYPE } from "../../constants";
import { getItem } from "../item/item-utils";
import { GameUpdatePacket } from "../packets/game-packet";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { addRoleXp } from "../quests/role-quests";
import { TileFlags } from "../world/constants";
import type { World } from "../world/world";

/** Rods and their maximum catch weight (lbs), transcribed from the retail item data. */
export interface RodDef {
  id: number;
  maxLbs: number;
  /** 1 in N chance for a gear catch, 0 = never. */
  gearChance: number;
}

export const FISHING_RODS: Readonly<Record<number, RodDef>> = {
  2912: { id: 2912, maxLbs: 25, gearChance: 0 },
  3008: { id: 3008, maxLbs: 40, gearChance: 0 },
  3010: { id: 3010, maxLbs: 60, gearChance: 450 },
  5740: { id: 5740, maxLbs: 90, gearChance: 350 },
  3100: { id: 3100, maxLbs: 150, gearChance: 250 },
  3040: { id: 3040, maxLbs: 200, gearChance: 200 },
  6254: { id: 6254, maxLbs: 80, gearChance: 350 },
  6256: { id: 6256, maxLbs: 120, gearChance: 300 },
  6932: { id: 6932, maxLbs: 100, gearChance: 300 },
  10262: { id: 10262, maxLbs: 220, gearChance: 150 },
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
  4246, // Minor Otherworldly Bait
  4248, // Lesser Otherworldly Bait
  5526, // Snail Bait
  5528, // Mega-Pellet Bait
]);

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

/** How long the client has to wait for a bite before the fish escapes. */
const BITE_TIMEOUT_MS = 30_000;
/** How long the player must stay still before the bite can roll. */
const BITE_DELAY_MS = 2000;
/** Tile reach of a cast. */
const CAST_RANGE = 2;

export interface FishingSession {
  tileX: number;
  tileY: number;
  baitId: number;
  baitName: string;
  rodId: number;
  startedAt: number;
  triggered: boolean;
  playerTileX: number;
  playerTileY: number;
}

/**
 * Whether a tile is water: the water tile flag, which is how the client marks
 * liquid tiles when it serializes a world.
 */
export function isWaterTile(block: { flags: number } | null | undefined): boolean {
  return !!block && (block.flags & TileFlags.WATER) !== 0;
}

/** Determines if an item is a fishing rod. */
export function isFishingRod(itemId: number): boolean {
  if (FISHING_RODS[itemId]) return true;
  return (getItem(itemId)?.name ?? "").toLowerCase().includes("fishing rod");
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

  if (!isWaterTile(world.getTileAt(tileX, tileY))) {
    player.sendTextBubble("You can only use bait on water!", true);
    return true;
  }

  const playerTileX = Math.floor(player.state.x / 32);
  const playerTileY = Math.floor(player.state.y / 32);
  if (Math.abs(playerTileX - tileX) > CAST_RANGE || Math.abs(playerTileY - tileY) > CAST_RANGE) {
    player.sendTextBubble("That's too far away to cast!", true);
    return true;
  }

  // Using bait again while the line is out reels it in.
  if (player.fishing) {
    reelIn(player, world);
    return true;
  }

  if (!player.inventory.hasItem(itemId)) return true;
  player.removeItemInven(itemId, 1, true);

  player.fishing = {
    tileX,
    tileY,
    baitId: itemId,
    baitName: getItem(itemId)?.name ?? "bait",
    rodId,
    startedAt: Date.now(),
    triggered: false,
    playerTileX,
    playerTileY,
  };

  sendFishingAnimation(world, player.netID, tileX, tileY, 0);
  player.sendTextBubble("`wYou cast your line and wait for a bite...``");
  return true;
}

/** Rolls bites and expiry for every angler in the world. */
export function tickFishing(world: World): void {
  const now = Date.now();
  for (const player of world.players) {
    const session = player.fishing;
    if (!session) continue;

    if (!session.triggered && now - session.startedAt > BITE_TIMEOUT_MS) {
      stopFishing(player, world, "`wThere was nothing on the line!``");
      continue;
    }

    if (!session.triggered && now - session.startedAt >= BITE_DELAY_MS && Math.random() <= 0.4) {
      session.triggered = true;
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

  let caughtItem: number;
  let isFish = false;
  let count = 1;

  if (rod.gearChance > 0 && Math.floor(Math.random() * rod.gearChance) === 0) {
    caughtItem = GEAR_BASE_IDS[Math.floor(Math.random() * GEAR_BASE_IDS.length)] ?? 344;
  } else if (session.baitId === 3016 && Math.random() < 0.08) {
    caughtItem = BLOCK_BASE_IDS[Math.floor(Math.random() * BLOCK_BASE_IDS.length)] ?? 444;
  } else {
    isFish = true;
    caughtItem = FISH_BASE_IDS[Math.floor(Math.random() * FISH_BASE_IDS.length)] ?? 3000;
    count = Math.floor(Math.random() * rod.maxLbs) + 1;
  }

  // Role perks: an infusion bonus at level 2+, a rare bonus at level 3+.
  const bonusChance = Math.min(5, Math.max(1, Math.floor(fishLevel / 2)));
  if (fishLevel >= 2 && Math.random() * 100 <= bonusChance) {
    const bonus = GEAR_BASE_IDS[Math.floor(Math.random() * GEAR_BASE_IDS.length)] ?? 344;
    player.addItemInven(bonus, 1);
    player.variants.sendOnConsoleMessage(`Bonus catch: \`w${getItem(bonus)?.name ?? bonus}\`\``);
  } else if (fishLevel >= 3 && Math.random() * 100 <= 1) {
    player.addItemInven(260, 1);
    player.variants.sendOnConsoleMessage("Bonus catch: `wGolden Block``");
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

  const added = player.addItemInven(caughtItem, isFish ? 1 : count);
  if (added <= 0) world.drop(player, player.state.x, player.state.y + 16, caughtItem, isFish ? 1 : count);

  const itemName = getItem(caughtItem)?.name ?? `item ${caughtItem}`;
  const catchText = isFish ? `${count} lb. ${itemName}` : itemName;
  player.sendTextBubble(`\`wYou caught a \`2${catchText}\`w!\`\``, true);
  world.playPositioned("audio/getpoint.wav", player.netID);

  for (const other of world.players) {
    other.variants.sendOnConsoleMessage(`\`$${player.formattedName} \`ocaught \`$${catchText} \`oand got \`$${gems} \`ogems`);
  }

  stopFishing(player, world);
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
