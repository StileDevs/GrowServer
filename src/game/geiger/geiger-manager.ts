import { TANK_PACKET_TYPE } from "../../constants";
import { getItem } from "../item/item-utils";
import { GameUpdatePacket } from "../packets/game-packet";
import type { Player } from "../player";
import { isSunday } from "../quests/quest-state";
import { addRoleXp } from "../quests/role-quests";
import type { World } from "../world/world";

/** Normal Geiger rewards, including the wiki's Nerd Hair prize. */
export const GEIGER_REWARDS: readonly number[] = [
  6416, 2206, 3792, 3196, 4654, 3306, 1498, 1500, 2804, 2806, 8270, 8272, 8274, 2242, 2244, 2246, 2248, 2250, 12502,
];

/** Server balance weights; official per-item probabilities are not published. */
const REWARD_WEIGHTS: Readonly<Record<number, number>> = {
  2242: 10, 2244: 10, 2246: 10, 2248: 2, 2250: 1, 4654: 1, 12502: 1,
};
const STUFF_IDS = new Set([1498, 1500, 2804, 2806, 8270, 8272, 8274]);

/** Picks a normal prize using the server's explicit rarity weights. */
export function rollGeigerReward(random = Math.random): number {
  const total = GEIGER_REWARDS.reduce((sum, id) => sum + (REWARD_WEIGHTS[id] ?? 100), 0);
  let roll = random() * total;
  for (const id of GEIGER_REWARDS) {
    roll -= REWARD_WEIGHTS[id] ?? 100;
    if (roll < 0) return id;
  }
  return GEIGER_REWARDS[GEIGER_REWARDS.length - 1]!;
}

/** Awards the prize bundle and drops any amount that cannot fit in the backpack. */
function grantGeigerReward(player: Player, world: World, id: number): void {
  const amount = id === 6416 ? 5 : STUFF_IDS.has(id) ? 3 : 1;
  const added = player.addItemInven(id, amount);
  if (added < amount) world.drop(player, player.state.x, player.state.y + 16, id, amount - added);
}

export interface GeigerSession {
  targetX: number;
  targetY: number;
  lastPulseAt: number;
}

/**
 * Handles Geiger Counter radiation detection on the fast server tick.
 * Transcribed from GTOS Main.cpp:17418 and world.h:4194 (find_geiger).
 */
export function tickGeiger(player: Player, now = Date.now()): void {
  const world = player.world;
  if (!world) {
    player.geiger = null;
    return;
  }
  // Must hold Geiger Counter (2204) in hand
  if (player.inventory.clothes.hand !== 2204) {
    player.geiger = null;
    return;
  }

  // If already irradiated (cooldown), Geiger cannot hunt
  if (player.playMods.has("irradiated")) return;

  if (!player.geiger) {
    player.geiger = {
      targetX: Math.floor(Math.random() * ((world.width - 4) * 32)) + 64,
      targetY: Math.floor(Math.random() * ((world.height - 4) * 32)) + 64,
      lastPulseAt: 0,
    };
  }

  const dx = player.geiger.targetX - player.state.x;
  const dy = player.geiger.targetY - player.state.y;
  const dist = Math.hypot(dx, dy);
  // Preserve the upstream detection limit of 30 world blocks.
  if (dist > 30 * 32) return;

  // Recompute from the current distance so approaching speeds up immediately.
  // Green slows to 1.4 seconds at its outer edge, reaching 200ms only within 50px.
  // Continue smoothly through yellow (1.4–2.2 seconds) and red (up to 3 seconds).
  const pulseIntervalMs = dist <= 200
    ? 200 + Math.max(0, dist - 50) * 8
    : Math.min(3000, 1400 + (dist - 200) * 4);
  if (player.geiger.lastPulseAt !== 0 && now - player.geiger.lastPulseAt < pulseIntervalMs) return;
  player.geiger.lastPulseAt = now;

  // 1. RADIATION SOURCE FOUND! (within ~30 pixels)
  if (Math.abs(dx) <= 32 && Math.abs(dy) <= 32) {
    // Found particle: size 3 (white flash/source found)
    sendGeigerParticle(player, 3);

    // Roll reward item from GTOS table
    const rewardId = rollGeigerReward();
    const itemName = getItem(rewardId)?.name ?? `Item ${rewardId}`;

    const roleState = player.quests.role("geiger");
    const geigerLevel = roleState.lvl;

    // Role perks from GTOS
    const infusionChance = Math.min(5, Math.max(1, Math.floor(geigerLevel / 2)));
    if (geigerLevel >= 2 && Math.random() * 100 < infusionChance) {
      const bonusReward = rollGeigerReward();
      grantGeigerReward(player, world, bonusReward);
      player.variants.sendOnConsoleMessage(`Infusion bonus obtained \`w${getItem(bonusReward)?.name ?? bonusReward}\`\``);
    } else if (geigerLevel >= 3 && Math.random() * 100 < 1) {
      grantGeigerReward(player, world, 4658); // Uranium Block
      player.variants.sendOnConsoleMessage("Obtained Uranium Block");
    } else if (geigerLevel >= 5 && Math.random() * 100 < 1) {
      grantGeigerReward(player, world, 6976); // Electrical Power Cube
      player.variants.sendOnConsoleMessage("Obtained Electrical Power Cube");
    } else if (geigerLevel >= 10 && Math.random() * 100 < 1) {
      grantGeigerReward(player, world, 1486); // Growtoken
      player.variants.sendOnConsoleMessage("Obtained Growtoken");
    }

    // Grant found item
    grantGeigerReward(player, world, rewardId);

    addRoleXp(player, "geiger", 10);
    player.sendTextBubble(`I found a \`2${itemName}\`\`!`, true);
    world.playPositioned("audio/getpoint.wav", player.netID);

    // Weil Magic perk (Level >= 4): 1% to 2% chance of gaining extra bonus drop (GTOS world.h:4038)
    const weilChance = geigerLevel >= 7 ? 2 : geigerLevel >= 4 ? 1 : 0;
    if (weilChance > 0 && Math.random() * 100 < weilChance) {
      const extraItem = rollGeigerReward();
      grantGeigerReward(player, world, extraItem);
      player.variants.sendOnConsoleMessage(`\`2[Weil Magic]: Extra bonus item obtained \`w${getItem(extraItem)?.name ?? extraItem}\`\`!`);
    }

    // Turn Geiger Counter into Dead Geiger Counter (2286)
    player.removeItemInven(2204, 1, true);
    player.addItemInven(2286, 1);

    // Apply Irradiated play mod (30 minutes, or 15 minutes on Sunday)
    // Infusion perk: 1% to 5% chance of avoiding irradiated mod (GTOS Main.cpp:14028)
    const avoidModChance = geigerLevel >= 2 ? Math.min(5, Math.max(1, Math.floor(geigerLevel / 2))) : 0;
    if (avoidModChance > 0 && Math.random() * 100 < avoidModChance) {
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

  // 2. RADIATION DISTANCE SIGNALS:
  // Red: 15–30 blocks; yellow: 7.5–15 blocks; green: within 7.5 blocks.
  if (dist > 15 * 32) {
    sendGeigerParticle(player, 0);
  } else if (dist > 7.5 * 32) {
    sendGeigerParticle(player, 1);
  } else {
    sendGeigerParticle(player, 2);
  }
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
