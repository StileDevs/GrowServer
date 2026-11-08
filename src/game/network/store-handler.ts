import { DialogBuilder } from "../../utils/dialog-builder";
import { items } from "../item/item-info";
import { getItem } from "../item/item-utils";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { DEFAULT_INVENTORY_SIZE } from "../player/inventory";
import { ActionTypes, ITEM_ID } from "../world/constants";
import { productsForTab, storeProducts, StoreTab, STORE_TAB_BUTTONS, type StoreProduct } from "./store-catalog";

/** Largest backpack the store upgrade can reach (16 + 38 upgrades of 10). */
const MAX_BACKPACK_UPGRADES = 38;
/** Slots granted per backpack upgrade. */
const BACKPACK_UPGRADE_SLOTS = 10;
/** Pseudo item id the catalog uses for the backpack upgrade. */
const BACKPACK_UPGRADE_ITEM = 9412;
/** Sound played to the buyer after a successful purchase. */
const PURCHASE_SOUND = "audio/cash_register.wav";

/** Products shown on the home tab. */
const FEATURED_BUTTONS = ["world_lock", "small_lock", "vending_machine", "small_seed_pack", "weather_sunny", "door_and_sign_hello_pack"];

const TAB_BUTTONS = `enable_tabs|1
add_tab_button|main_menu|Home|interface/large/btn_shop.rttex||{0}|0|0|0||||-1|-1|||0|0|CustomParams:|
add_tab_button|locks_menu|Locks And Stuff|interface/large/btn_shop.rttex||{1}|1|0|0||||-1|-1|||0|0|CustomParams:|
add_tab_button|itempack_menu|Item Packs|interface/large/btn_shop.rttex||{2}|3|0|0||||-1|-1|||0|0|CustomParams:|
add_tab_button|bigitems_menu|Awesome Items|interface/large/btn_shop.rttex||{3}|4|0|0||||-1|-1|||0|0|CustomParams:|
add_tab_button|weather_menu|Weather Machines|interface/large/btn_shop.rttex|Tired of the same sunny sky?  We offer alternatives within...|{4}|5|0|0||||-1|-1|||0|0|CustomParams:|
add_tab_button|token_menu|Growtoken Items|interface/large/btn_shop.rttex||{5}|2|0|0||||-1|-1|||0|0|CustomParams:|
`;

const TAB_DESCRIPTIONS: Record<StoreTab, string> = {
  [StoreTab.HOME]: "Welcome to the `2Growtopia Store``! Select the item you'd like more info on.`o `wThanks for playing on GrowServer!",
  [StoreTab.LOCKS]: "`2Locks And Stuff!``  Select the item you'd like more info on, or BACK to go back.",
  [StoreTab.ITEM_PACKS]: "`2Item Packs!``  Select the item you'd like more info on, or BACK to go back.",
  [StoreTab.AWESOME_ITEMS]: "`2Awesome Items!``  Select the item you'd like more info on, or BACK to go back.",
  [StoreTab.WEATHER]: "`2Weather Machines!``  Select the item you'd like more info on, or BACK to go back.",
  [StoreTab.GROWTOKENS]: "`2Spend your Growtokens!`` (You have `5{tokens}``) You earn Growtokens from Crazy Jim and Sales-Man. Select the item you'd like more info on, or BACK to go back.",
};

/** Number of backpack upgrades the player already bought. */
function backpackUpgrades(player: Player): number {
  return Math.max(0, Math.floor((player.inventory.max - DEFAULT_INVENTORY_SIZE) / BACKPACK_UPGRADE_SLOTS));
}

/** Gem price of the next backpack upgrade (grows quadratically like the official store). */
function backpackUpgradeCost(player: Player): number {
  const n = backpackUpgrades(player) + 1;
  return 100 * n * n - 200 * n + 200;
}

/** The product's price for this player (the backpack upgrade is dynamic). */
function productCost(player: Player, product: StoreProduct): number {
  if (product.button === "upgrade_backpack") return backpackUpgradeCost(player);
  return Math.abs(product.cost);
}

function productButton(player: Player, product: StoreProduct): string {
  // a negative price makes the client draw the Growtoken icon instead of gems
  const cost = productCost(player, product);
  const shownCost = product.tab === StoreTab.GROWTOKENS ? -cost : cost;
  return `add_button|${product.button}|${product.name}|${product.texture}|${product.description}|${product.textureX}|${product.textureY}|${shownCost}|0|||-1|-1||-1|-1||1||||||0|0|CustomParams:|\n`;
}

/**
 * Builds the store page for a tab, optionally pre-selecting one product.
 */
function storePage(player: Player, tab: StoreTab, selection = ""): string {
  const tokens = player.inventory.getAmount(ITEM_ID.GROWTOKEN);
  const dialog = new DialogBuilder()
    .raw(`set_description_text|${TAB_DESCRIPTIONS[tab].replace("{tokens}", String(tokens))}\n`)
    .raw(TAB_BUTTONS.replace(/\{(\d)\}/g, (_, index: string) => (Number(index) === tab ? "1" : "0")));

  if (tab === StoreTab.HOME) {
    dialog.raw("add_banner|interface/large/gui_shop_featured_header.rttex|0|1|\n");
    for (const button of FEATURED_BUTTONS) {
      const product = storeProducts.get(button);
      if (product) dialog.raw(productButton(player, product));
    }
  } else {
    for (const product of productsForTab(tab)) {
      if (product.button === "upgrade_backpack" && backpackUpgrades(player) >= MAX_BACKPACK_UPGRADES) continue;
      dialog.raw(productButton(player, product));
    }
  }

  if (selection) dialog.raw(`select_item|${selection}\n`);
  return dialog.str();
}

/** Opens the in-game store on the home tab. */
export function openStore(player: Player): void {
  player.variants.sendVariant(Variant.from("OnSetVouchers", 0));
  player.variants.sendVariant(Variant.from("OnStoreRequest", storePage(player, StoreTab.HOME)));
}

/**
 * Handles `buy` / `storenavigate`: `name` is either a tab button or a product button.
 */
export function handleStoreBuy(player: Player, name: string, selection = ""): void {
  const tab = STORE_TAB_BUTTONS.get(name);
  if (tab !== undefined) {
    player.variants.sendVariant(Variant.from("OnStoreRequest", storePage(player, tab, selection)));
    return;
  }

  const product = storeProducts.get(name);
  if (!product) return;
  purchase(player, product);
}

function randomItems(filter: (rarity: number, type: number) => boolean, count: number): Array<{ id: number; amount: number }> {
  const pool: number[] = [];
  for (const item of items.meta.items.values()) {
    if (item.id && filter(item.rarity ?? 999, item.type ?? -1)) pool.push(item.id);
  }
  const picked: Array<{ id: number; amount: number }> = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    picked.push({ id: pool[Math.floor(Math.random() * pool.length)]!, amount: 1 });
  }
  return picked;
}

/** Items granted by a product; random packs are rolled here. */
function rollProductItems(product: StoreProduct): Array<{ id: number; amount: number }> {
  switch (product.button) {
    case "basic_splice":
      return [{ id: 11, amount: 10 }, ...randomItems((rarity, type) => type === ActionTypes.SEED && rarity === 2, 10)];
    case "rare_seed":
      return randomItems((rarity, type) => type === ActionTypes.SEED && rarity >= 13 && rarity <= 60, 5);
    case "clothes_pack":
      return randomItems((rarity, type) => type === ActionTypes.CLOTHES && rarity <= 10, 3);
    case "rare_clothes_pack":
      return randomItems((rarity, type) => type === ActionTypes.CLOTHES && rarity >= 11 && rarity <= 60, 3);
    default:
      return product.items;
  }
}

function purchase(player: Player, product: StoreProduct): void {
  const cost = productCost(player, product);
  const withTokens = product.tab === StoreTab.GROWTOKENS;
  const balance = withTokens ? player.inventory.getAmount(ITEM_ID.GROWTOKEN) : player.gems;

  if (balance < cost) {
    const short = cost - balance;
    player.variants.sendVariant(
      Variant.from("OnStorePurchaseResult", withTokens ? `You can't afford \`0${product.name}\`\`!  You're \`$${short}\`\` \`2Growtokens\`\` short.` : `You can't afford \`0${product.name}\`\`!  You're \`$${short}\`\` Gems short.`),
    );
    return;
  }

  const granted = rollProductItems(product);
  if (granted.length === 0 && product.button !== "upgrade_backpack") {
    player.variants.sendVariant(Variant.from("OnStorePurchaseResult", "`4That item isn't available on this server yet.``"));
    return;
  }

  // everything must fit before anything is charged
  const physical = granted.filter((entry) => entry.id !== BACKPACK_UPGRADE_ITEM);
  for (const entry of physical) {
    if (!player.inventory.canAddItem(entry.id, entry.amount)) {
      player.variants.sendVariant(Variant.from("OnStorePurchaseResult", "`4You don't have room in your backpack for that!``"));
      return;
    }
  }

  if (withTokens) player.removeItemInven(ITEM_ID.GROWTOKEN, cost);
  else player.setGems(player.gems - cost);

  const received: string[] = [];
  for (const entry of granted) {
    if (entry.id === BACKPACK_UPGRADE_ITEM) {
      player.inventory.max += entry.amount;
      player.sendInventory();
      player.scheduleInventorySave();
      received.push(`${entry.amount} backpack slots`);
      continue;
    }
    player.addItemInven(entry.id, entry.amount);
    received.push(`${getItem(entry.id)?.name ?? entry.id}${entry.amount > 1 ? ` x${entry.amount}` : ""}`);
  }

  player.sendSfx(PURCHASE_SOUND);

  // the backpack upgrade price and the Growtoken balance are part of the
  // page, so redraw the tab before the result pops up over it
  if (product.button === "upgrade_backpack" || withTokens) {
    player.variants.sendVariant(Variant.from("OnStoreRequest", storePage(player, product.tab)));
  }

  const left = withTokens ? player.inventory.getAmount(ITEM_ID.GROWTOKEN) : player.gems;
  const currency = withTokens ? "`2Growtokens``" : "Gems";
  player.variants.sendVariant(
    Variant.from("OnStorePurchaseResult", `You've purchased \`0${product.name}\`\` for \`$${cost}\`\` ${currency}.\nYou have \`$${left}\`\` ${currency} left.\n\n\`5Received: \`\`\`0${received.join(", ")}\`\``),
  );
}
