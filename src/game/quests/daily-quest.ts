import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { DialogBuilder } from "../../utils/dialog-builder";
import { logger } from "../../utils/logger";
import { getItem } from "../item/item-utils";
import type { Player } from "../player";
import { CRAZY_JIM_GEM_REWARD, CRAZY_JIM_ICON, CRAZY_JIM_ITEMS_1, CRAZY_JIM_ITEMS_2 } from "./constants";
import { todayNumber } from "./quest-state";

/** One Crazy Jim daily delivery, persisted in `data/daily-quest.json`. */
export interface DailyQuest {
  item1: number;
  item2: number;
  item1c: number;
  item2c: number;
  /** Day (yyyymmdd) the delivery was generated for. */
  day: number;
}

const STORE_PATH = "data/daily-quest.json";

/** In-memory copy of the store, shared by every player. */
let cached: DailyQuest | null = null;

function randomOf(list: readonly number[]): number {
  return list[Math.floor(Math.random() * list.length)] ?? 0;
}

function rollQuest(day: number): DailyQuest {
  // the reference picks each item from the pool with a 50% chance of taking
  // the id before it (the seed of the block)
  const shift = () => (Math.random() < 0.5 ? -1 : 0);
  return {
    item1: randomOf(CRAZY_JIM_ITEMS_1) + shift(),
    item2: randomOf(CRAZY_JIM_ITEMS_2) + shift(),
    item1c: (Math.floor(Math.random() * 200) % 200) + 1,
    item2c: (Math.floor(Math.random() * 100) % 100) + 1,
    day,
  };
}

/**
 * Today's Crazy Jim delivery. Loads `data/daily-quest.json`, regenerating and
 * persisting it when the day changed or the file is missing/broken.
 */
export function ensureDailyQuest(): DailyQuest {
  const today = todayNumber();
  if (cached && cached.day === today) return cached;

  let quest: DailyQuest | null = null;
  try {
    if (existsSync(STORE_PATH)) {
      const parsed = JSON.parse(readFileSync(STORE_PATH, "utf-8")) as Partial<DailyQuest>;
      if (
        typeof parsed.item1 === "number" &&
        typeof parsed.item2 === "number" &&
        typeof parsed.item1c === "number" &&
        typeof parsed.item2c === "number" &&
        typeof parsed.day === "number"
      ) {
        quest = parsed as DailyQuest;
      }
    }
  } catch (err) {
    logger.warn({ err, path: STORE_PATH }, "daily quest store is broken, rolling a new one");
  }

  if (!quest || quest.day !== today) {
    quest = rollQuest(today);
    try {
      mkdirSync("data", { recursive: true });
      const tmp = `${STORE_PATH}.tmp`;
      writeFileSync(tmp, JSON.stringify(quest));
      renameSync(tmp, STORE_PATH);
    } catch (err) {
      logger.error({ err, path: STORE_PATH }, "failed to save the daily quest store");
    }
    logger.info({ day: quest.day, item1: quest.item1, item2: quest.item2, item1c: quest.item1c, item2c: quest.item2c }, "daily quest rolled");
  }

  cached = quest;
  return quest;
}

/** Item name for dialogs, falling back to the raw id. */
function itemName(id: number): string {
  return getItem(id)?.name ?? `item ${id}`;
}

/**
 * The Crazy Jim line of the goals dialog, exactly as the reference builds it:
 * "Deliver X item and Y item to Crazy Jim", or the completed marker.
 */
export function dailyQuestLine(player: Player): string {
  const quest = ensureDailyQuest();
  if (player.quests.lastDeliveryDay === quest.day) return "`2COMPLETE!`` Check again tomorrow.";
  return `Deliver \`2${quest.item1c} ${itemName(quest.item1)}\`\` and \`2${quest.item2c} ${itemName(quest.item2)}\`\` to Crazy Jim`;
}

/** Whether today's Crazy Jim delivery was already completed. */
export function isDailyQuestDone(player: Player): boolean {
  return player.quests.lastDeliveryDay === ensureDailyQuest().day;
}

/**
 * Completion of the Crazy Jim delivery: both item stacks must be in the
 * backpack, they are consumed and the gem reward is granted.
 */
export function deliverDailyQuest(player: Player): boolean {
  const quest = ensureDailyQuest();
  if (player.quests.lastDeliveryDay === quest.day) {
    player.sendTextBubble("You already completed today's delivery. Check again tomorrow.", true);
    return false;
  }

  if (player.inventory.getAmount(quest.item1) < quest.item1c || player.inventory.getAmount(quest.item2) < quest.item2c) {
    player.sendTextBubble(`You still need \`w${quest.item1c} ${itemName(quest.item1)}\`\` and \`w${quest.item2c} ${itemName(quest.item2)}\`\` for Crazy Jim.`, true);
    return false;
  }

  player.removeItemInven(quest.item1, quest.item1c);
  player.removeItemInven(quest.item2, quest.item2c);
  const gemReward = CRAZY_JIM_GEM_REWARD + (player.playMods.has("gemonade") ? 500 : 0);
  player.addGems(gemReward);
  const tokenCount = player.playMods.has("growlectables") && Math.random() < 0.25 ? 2 : 1;
  player.addItemInven(1486, tokenCount);
  player.quests.markDailyDelivered();

  const message = `You delivered \`w${quest.item1c} ${itemName(quest.item1)}\`\` and \`w${quest.item2c} ${itemName(quest.item2)}\`\` to Crazy Jim and got \`w${gemReward}\`\` gems and \`2${tokenCount} Growtoken${tokenCount > 1 ? "s" : ""}\`\`!`;
  player.sendTextBubble(message, true);
  player.variants.sendOnConsoleMessage(message);
  logger.info({ player: player.tankIDName, item1: quest.item1, item2: quest.item2 }, "crazy jim daily delivery completed");
  return true;
}

/**
 * The "Daily Quests" dialog: the Crazy Jim delivery with its deliver button.
 */
export function questDailyDialog(player: Player): string {
  const quest = ensureDailyQuest();
  const done = player.quests.lastDeliveryDay === quest.day;

  const dialog = new DialogBuilder()
    .defaultColor()
    .embed("netID", player.netID)
    .addLabelWithIcon("`wDaily Quests``", CRAZY_JIM_ICON, "big")
    .addSpacer("small")
    .addTextBox("`9Crazy Jim's Delivery``")
    .addLabelWithIcon(dailyQuestLine(player), CRAZY_JIM_ICON, "small");

  if (!done) {
    dialog.addSmallText(`\`oYou have \`w${player.inventory.getAmount(quest.item1)}\`\`/\`w${quest.item1c}\`\` ${itemName(quest.item1)} and \`w${player.inventory.getAmount(quest.item2)}\`\`/\`w${quest.item2c}\`\` ${itemName(quest.item2)}.`)
      .addSpacer("small")
      .addButton("daily_deliver", "`2Deliver to Crazy Jim``");
  }

  dialog.addQuickExit().endDialog("quest_daily", "", "Close");
  return dialog.str();
}
