import { DialogBuilder } from "../../utils/dialog-builder";
import { logger } from "../../utils/logger";
import { getItem } from "../item/item-utils";
import type { Player } from "../player";
import { MAX_ITEM_STACK } from "../player/inventory";
import { CRAZY_JIM_ICON, ROLE_MILESTONES, ROLES, ROLE_ORDER, roleXpRequirement, type RoleId } from "./constants";
import { dailyQuestLine, isDailyQuestDone } from "./daily-quest";

/** Claim button prefix of each role (`s_claimreward3` etc., like the reference). */
const ROLE_CLAIM_PREFIX: Readonly<Record<RoleId, string>> = {
  surgeon: "s",
  fishing: "f",
  builder: "b",
  farmer: "t",
  provider: "p",
  geiger: "g",
};

/** Dialog name of each role's milestone reward dialog. */
const ROLE_REWARD_DIALOG: Readonly<Record<RoleId, string>> = {
  surgeon: "quest_reward_surgeon",
  fishing: "quest_reward_fishing",
  builder: "quest_reward_builder",
  farmer: "quest_reward_farmer",
  provider: "quest_reward_provider",
  geiger: "quest_reward_geiger",
};

/** Goals dialog button that opens a role's reward dialog. */
const ROLE_REWARD_BUTTON: Readonly<Record<RoleId, string>> = {
  surgeon: "surgeon_reward",
  fishing: "fishing_reward",
  builder: "builder_reward",
  farmer: "farmer_reward",
  provider: "provider_reward",
  geiger: "geiger_reward",
};

/** Descriptions of the roles, from the reference reward dialogs. */
const ROLE_DESCRIPTION: Readonly<Record<RoleId, string>> = {
  surgeon: "Surgery is a feature in Growtopia that allows players to perform various types of surgeries on other players using various tools. It was first introduced in the Growtopia General Hospital update on November 21, 2013. Surgery XP is only added if the surgery was performed on a real patient.",
  fishing: "In Growtopia, fishing can be done by using bait on water while holding a Fishing Rod. The result from fishing can either be Fish or some random items that are obtainable through fishing.",
  builder: "Keep breaking blocks and achieve awesome rewards everyday by leveling up",
  farmer: "Harvest your trees and receive awesome Farmer Rewards everyday by leveling up",
  provider: "A provider is a non-solid foreground block which can be harvested periodically (time depends on the provider) for an item. Harvest your providers and earn awesome rewards by leveling up!",
  geiger: "Once the player stands for a few moments on the source of radioactivity, the item they found will be added into their inventory. Hunt the items with your geiger and claim your prizes for leveling up!",
};

/** Name of an item for dialogs, falling back to the raw id. */
function itemName(id: number): string {
  return getItem(id)?.name ?? `item ${id}`;
}

/**
 * Grants an item stack to a player, dropping what does not fit in the
 * backpack on the ground below them (like the reference's modify_inventory).
 */
function grantItems(player: Player, itemId: number, amount: number): void {
  const added = player.addItemInven(itemId, amount);
  const rest = amount - added;
  if (rest > 0 && player.world) {
    player.world.drop(player, player.state.x, player.state.y + 16, itemId, rest);
    player.variants.sendOnConsoleMessage(`Your backpack was full, \`w${rest}\`\` ${itemName(itemId)} dropped on the ground.`);
  }
}

/**
 * Grants role xp. Hook points: surgery success (surgeon), tree harvest
 * (farmer), block placement (builder); fishing, geiger and provider expose
 * this same function for their future systems.
 */
export function addRoleXp(player: Player, role: RoleId, amount: number): void {
  player.quests.addRoleXp(role, amount);
}

/** The role section of the goals dialog: progress bar plus reward button. */
function roleSection(dialog: DialogBuilder, player: Player, id: RoleId): void {
  const def = ROLES[id];
  const role = player.quests.role(id);
  dialog
    .addPlayerInfo(`\`o${def.name}\`\``, role.lvl, role.xp, roleXpRequirement(role.lvl, id))
    .addSpacer("small")
    .addButton(ROLE_REWARD_BUTTON[id], `\`wView ${def.name} Rewards\`\`|noflags|0|0|`.replace("|noflags|0|0|", ""));
}
/**
 * The goals dialog (ItsKyy "goals"): the Crazy Jim daily delivery with its
 * deliver button and one progress bar plus reward button per role.
 */
export function questGoalsDialog(player: Player): string {
  const dialog = new DialogBuilder()
    .defaultColor()
    .addLabelWithIcon(`${player.formattedName}'s Goals`, 982, "small")
    .addSpacer("small")
    .addTextBox("`9Daily Quest``")
    .addLabelWithIcon(dailyQuestLine(player), CRAZY_JIM_ICON, "small")
    .addSpacer("small");

  // the deliver button only shows while today's delivery is incomplete
  if (!isDailyQuestDone(player)) dialog.addButton("daily_deliver", "`2Deliver to Crazy Jim``");

  dialog.addTextBox("`9Finish and receive awesome rewards from farming, geiger finding or trees removing, checkout the prizes below.``");

  for (const id of ROLE_ORDER) {
    roleSection(dialog, player, id);
    dialog.addSpacer("small");
  }

  dialog.addQuickExit().endDialog("quest_goals", "", "Back");
  return dialog.str();
}

/**
 * The milestone reward dialog of one role (ItsKyy *_reward_show): every 5
 * levels with a claim button once the level is reached, progress bar included.
 */
export function roleRewardDialog(player: Player, id: RoleId): string {
  const def = ROLES[id];
  const role = player.quests.role(id);
  const prefix = ROLE_CLAIM_PREFIX[id];

  let prizes = "";
  for (let i = 0; i < ROLE_MILESTONES.length; i++) {
    const level = ROLE_MILESTONES[i] ?? 0;
    const item = def.rewards[i] ?? 0;
    const count = def.rewardCounts[i] ?? 1;
    const label = `${count} ${itemName(item)}`;
    if (role.claimed.includes(level)) {
      prizes += `\nadd_smalltext|\`w#${i + 1}: Reach ${def.name} Level ${level} to claim this reward:\`\`|left|\nadd_label_with_icon|small|\`r(Unlocked) ${label}\`\`|left|${item}|\nadd_spacer|small|\n`;
    } else if (role.lvl >= level) {
      prizes += `\nadd_smalltext|\`w#${i + 1}: Reach ${def.name} Level ${level} to claim this reward:\`\`|left|\nadd_label_with_icon|small|\`w(Unlocked) ${label}\`\`|left|${item}|\nadd_small_font_button|${prefix}_claimreward${i + 1}|Claim Reward|noflags|0|0|\n`;
    } else {
      prizes += `\nadd_smalltext|\`w#${i + 1}: Reach ${def.name} Level ${level} to claim this reward:\`\`|left|\nadd_label_with_icon|small|\`s(Locked) ${label}\`\`|left|${item}|\n`;
    }
  }

  return new DialogBuilder()
    .defaultColor()
    .raw(
      `set_default_color|\`o\nadd_label_with_icon|big|\`w${def.name} Rewards\`\`|left|${def.icon}|\nadd_spacer|small|\nadd_textbox|\`9${ROLE_DESCRIPTION[id]}\`\`|left|${prizes}\nadd_player_info|\`o${def.name}\`\`|${role.lvl}|${role.xp}|${roleXpRequirement(role.lvl, id)}|\nadd_spacer|small|\nend_dialog|${ROLE_REWARD_DIALOG[id]}||Back|\nadd_quick_exit|\n`,
    )
    .str();
}

/** Parses a claim button (`s_claimreward3`) into role and milestone index. */
export function parseClaimButton(button: string): { role: RoleId; index: number } | null {
  for (const id of ROLE_ORDER) {
    const needle = `${ROLE_CLAIM_PREFIX[id]}_claimreward`;
    if (!button.startsWith(needle)) continue;
    const index = Number.parseInt(button.slice(needle.length), 10);
    if (Number.isInteger(index) && index >= 1 && index <= ROLE_MILESTONES.length) return { role: id, index: index - 1 };
  }
  return null;
}

/**
 * Claims a milestone reward: the level must be reached and not claimed yet.
 * Returns false when the claim is not allowed (the caller tells the player).
 */
export function claimRoleReward(player: Player, role: RoleId, index: number): boolean {
  const state = player.quests.role(role);
  const level = ROLE_MILESTONES[index];
  if (level === undefined) return false;
  if (state.lvl < level || state.claimed.includes(level)) return false;

  const def = ROLES[role];
  const item = def.rewards[index] ?? 0;
  const count = def.rewardCounts[index] ?? 1;
  if (item <= 0 || count <= 0 || count > MAX_ITEM_STACK) return false;

  player.quests.claimMilestone(role, level);
  grantItems(player, item, count);

  const message = `You claimed your ${def.name} level ${level} reward: \`w${count} ${itemName(item)}\`\`.`;
  player.sendTextBubble(message, true);
  player.variants.sendOnConsoleMessage(message);
  player.sendSfx("audio/success.wav");
  logger.info({ player: player.tankIDName, role, level, item, count }, "role milestone reward claimed");
  return true;
}

/** Re-sends a role reward dialog (after a claim). */
export function sendRoleRewardDialog(player: Player, role: RoleId): void {
  player.variants.sendOnDialogRequest(roleRewardDialog(player, role));
}

/** Sends the goals dialog to a player. */
export function sendGoalsDialog(player: Player): void {
  player.variants.sendOnDialogRequest(questGoalsDialog(player));
}
