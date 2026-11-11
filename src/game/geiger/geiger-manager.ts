import { TANK_PACKET_TYPE } from "../../constants";
import { getItem } from "../item/item-utils";
import { GameUpdatePacket } from "../packets/game-packet";
import type { Player } from "../player";
import { isSunday } from "../quests/quest-state";
import { addRoleXp } from "../quests/role-quests";
import type { World } from "../world/world";

/** Active Geiger Counter item id. */
const GEIGER_COUNTER = 2204;
/** Minimum time between radiation pulses. */
const GEIGER_PULSE_MS = 600;
/** Pixel size of one world block. */
const TILE_PX = 32;

/**
 * Ring bands in blocks, from the wiki:
 * red 15-30, yellow 7.5-15, green 4-7.5, rapid green 0-4.
 * Further than 30 blocks emits no rings at all.
 */
const GEIGER_RED_RANGE_BLOCKS = 30;
const GEIGER_YELLOW_RANGE_BLOCKS = 15;
const GEIGER_GREEN_RANGE_BLOCKS = 7.5;
const GEIGER_RAPID_GREEN_RANGE_BLOCKS = 4;
/**
 * Faster pulse interval inside the rapid green band. Kept below the 250 ms
 * fast tick so one pulse lands on every tick instead of every other tick.
 */
const GEIGER_RAPID_PULSE_MS = 200;

/** Ring color carried in particle 114's `speedX`. */
const GEIGER_SIGNAL = {
  RED: 0,
  YELLOW: 1,
  GREEN: 2,
  FOUND: 3,
} as const;

/** Rewards obtainable through Geiger hunting, from GTOS world.h:4204. */
export const GEIGER_REWARDS: readonly number[] = [
  6416, 2206, 3792, 3196, 4654, 3306, 1498, 1500, 2804, 2806, 8270, 8272, 8274, 2242, 2244, 2246, 2248, 2250,
];

export interface GeigerSession {
  targetX: number;
  targetY: number;
  nextPulseAt: number;
}

/**
 * Handles Geiger detection from a movement packet: immediate feedback while
 * the player walks. Idle pulses are driven by `tickGeiger` from the game tick.
 * Transcribed from GTOS Main.cpp:17418 and world.h:4194 (find_geiger).
 */
export function handleGeigerMovement(player: Player, world: World): void {
  pulseGeiger(player, world, Date.now());
}

/**
 * Server-authoritative Geiger pulse. Called by the game tick even when the
 * player is not sending movement packets.
 */
export function tickGeiger(player: Player, now = Date.now()): void {
  const world = player.world;
  if (!world) {
    player.geiger = null;
    return;
  }
  pulseGeiger(player, world, now);
}

function pulseGeiger(player: Player, world: World, now: number): void {
  // Must hold Geiger Counter (2204) in hand
  if (player.inventory.clothes.hand !== GEIGER_COUNTER) {
    player.geiger = null;
    return;
  }

  // If already irradiated (cooldown), Geiger cannot hunt
  if (player.playMods.has("irradiated")) return;

  if (!player.geiger) {
    player.geiger = {
      targetX: Math.floor(Math.random() * ((world.width - 4) * 32)) + 64,
      targetY: Math.floor(Math.random() * ((world.height - 4) * 32)) + 64,
      nextPulseAt: 0,
    };
  }

  if (now < player.geiger.nextPulseAt) return;

  const dx = player.geiger.targetX - player.state.x;
  const dy = player.geiger.targetY - player.state.y;

  // 1. RADIATION SOURCE FOUND! (standing on the source block)
  if (Math.abs(dx) <= TILE_PX && Math.abs(dy) <= TILE_PX) {
    player.geiger.nextPulseAt = now + GEIGER_PULSE_MS;
    // Found particle: size 3 (white flash/source found)
    sendGeigerParticle(player, GEIGER_SIGNAL.FOUND);

    // Roll reward item from GTOS table
    const rewardId = GEIGER_REWARDS[Math.floor(Math.random() * GEIGER_REWARDS.length)] ?? 2206;
    const itemName = getItem(rewardId)?.name ?? `Item ${rewardId}`;

    const roleState = player.quests.role("geiger");
    const geigerLevel = roleState.lvl;

    // Role perks from GTOS
    const infusionChance = Math.min(5, Math.max(1, Math.floor(geigerLevel / 2)));
    if (geigerLevel >= 2 && Math.random() * 100 <= infusionChance) {
      const bonusReward = GEIGER_REWARDS[Math.floor(Math.random() * GEIGER_REWARDS.length)] ?? 2206;
      player.addItemInven(bonusReward, 1);
      player.variants.sendOnConsoleMessage(`Infusion bonus obtained \`w${getItem(bonusReward)?.name ?? bonusReward}\`\``);
    } else if (geigerLevel >= 3 && Math.random() * 100 <= 1) {
      player.addItemInven(4658, 1); // Uranium Block
      player.variants.sendOnConsoleMessage("Obtained Uranium Block");
    } else if (geigerLevel >= 5 && Math.random() * 100 <= 1) {
      player.addItemInven(6976, 1); // Electrical Power Cube
      player.variants.sendOnConsoleMessage("Obtained Electrical Power Cube");
    } else if (geigerLevel >= 10 && Math.random() * 100 <= 1) {
      player.addItemInven(1486, 1); // Growtoken
      player.variants.sendOnConsoleMessage("Obtained Growtoken");
    }

    // Grant found item
    const added = player.addItemInven(rewardId, 1);
    if (added <= 0) {
      world.drop(player, player.state.x, player.state.y + 16, rewardId, 1);
    }

    addRoleXp(player, "geiger", 10);
    player.sendTextBubble(`I found a \`2${itemName}\`\`!`, true);
    world.playPositioned("audio/getpoint.wav", player.netID);

    // Weil Magic perk (Level >= 4): 1% to 2% chance of gaining extra bonus drop (GTOS world.h:4038)
    const weilChance = geigerLevel >= 7 ? 2 : geigerLevel >= 4 ? 1 : 0;
    if (weilChance > 0 && Math.random() * 100 <= weilChance) {
      const extraItem = GEIGER_REWARDS[Math.floor(Math.random() * GEIGER_REWARDS.length)] ?? 2206;
      player.addItemInven(extraItem, 1);
      player.variants.sendOnConsoleMessage(`\`2[Weil Magic]: Extra bonus item obtained \`w${getItem(extraItem)?.name ?? extraItem}\`\`!`);
    }

    // Turn Geiger Counter into Dead Geiger Counter (2286)
    player.removeItemInven(2204, 1, true);
    player.addItemInven(2286, 1);

    // Apply Irradiated play mod (30 minutes, or 15 minutes on Sunday)
    // Infusion perk: 1% to 5% chance of avoiding irradiated mod (GTOS Main.cpp:14028)
    const avoidModChance = geigerLevel >= 2 ? Math.min(5, Math.max(1, Math.floor(geigerLevel / 2))) : 0;
    if (avoidModChance > 0 && Math.random() * 100 <= avoidModChance) {
      player.variants.sendOnConsoleMessage("`2[Infusion Perk]: You avoided radiation!``");
    } else {
      const duration = isSunday() ? 900 : 1800;
      player.playMods.add("irradiated", duration);
    }

    // Reset target for future hunt
    player.geiger.targetX = Math.floor(Math.random() * ((world.width - 4) * 32)) + 64;
    player.geiger.targetY = Math.floor(Math.random() * ((world.height - 4) * 32)) + 64;
    return;
  }

  // 2. RADIATION DISTANCE SIGNALS, from the wiki:
  // red 15-30 blocks, yellow 7.5-15, green 4-7.5, rapid green 0-4.
  // Beyond 30 blocks there is no ring at all and the signal stays silent.
  const distanceInBlocks = Math.hypot(dx, dy) / TILE_PX;
  if (distanceInBlocks > GEIGER_RED_RANGE_BLOCKS) {
    // too far to detect: no rings, so the next pulse comes at the normal rate
    player.geiger.nextPulseAt = now + GEIGER_PULSE_MS;
    return;
  }

  if (distanceInBlocks > GEIGER_YELLOW_RANGE_BLOCKS) {
    player.geiger.nextPulseAt = now + GEIGER_PULSE_MS;
    sendGeigerParticle(player, GEIGER_SIGNAL.RED);
    return;
  }

  if (distanceInBlocks > GEIGER_GREEN_RANGE_BLOCKS) {
    player.geiger.nextPulseAt = now + GEIGER_PULSE_MS;
    sendGeigerParticle(player, GEIGER_SIGNAL.YELLOW);
    return;
  }

  if (distanceInBlocks > GEIGER_RAPID_GREEN_RANGE_BLOCKS) {
    player.geiger.nextPulseAt = now + GEIGER_PULSE_MS;
    sendGeigerParticle(player, GEIGER_SIGNAL.GREEN);
    return;
  }

  // rapid green: same ring, pulsing faster
  player.geiger.nextPulseAt = now + GEIGER_RAPID_PULSE_MS;
  sendGeigerParticle(player, GEIGER_SIGNAL.GREEN);
}

/**
 * Sends radiation wave particle 114 to the player.
 * size: 0 = red, 1 = yellow, 2 = green, 3 = found!
 */
function sendGeigerParticle(player: Player, size: number): void {
  player.sendBuffer(
    GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.SEND_PARTICLE_EFFECT,
      posX: player.state.x + 10,
      posY: player.state.y + 10,
      speedX: size,
      speedY: 114, // particle effect ID 114 = radiation wave
    }).parse()!,
  );
}
