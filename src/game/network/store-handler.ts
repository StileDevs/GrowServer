import { DialogBuilder } from "../../utils/dialog-builder";
import { Collection } from "../../utils/collection";
import { Variant, int32 } from "../packets/variants";
import type { Player } from "../player";
import { ITEM_ID } from "../world/constants";

interface StoreTab {
  id: string;
  label: string;
  position: number;
}

export interface StoreItem {
  name: string;
  title: string;
  description: string;
  image: string;
  imagePos: { x: number; y: number };
  /** Price in gems. */
  cost: number;
  itemId: number;
  amount: number;
}

const STORE_TABS: StoreTab[] = [
  { id: "main_menu", label: "main", position: 0 },
  { id: "player_menu", label: "player", position: 1 },
  { id: "token_menu", label: "growtoken", position: 2 },
  { id: "locks_menu", label: "packs", position: 3 },
  { id: "itempacks_menu", label: "bigitems", position: 4 },
  { id: "creativity_menu", label: "weather", position: 5 },
];

const STORE_BUTTONS = "interface/large/store_buttons/store_buttons.rttex";

/** Items sold per tab. */
export const storeItems: Collection<string, StoreItem[]> = new Collection([
  [
    "main",
    [
      { name: "wooden_background", title: "Wooden Background", description: "A pack of 10 Wooden Backgrounds.", image: STORE_BUTTONS, imagePos: { x: 1, y: 0 }, cost: 20, itemId: 52, amount: 10 },
      { name: "door_pack", title: "Door", description: "A door to link worlds together.", image: STORE_BUTTONS, imagePos: { x: 0, y: 0 }, cost: 50, itemId: ITEM_ID.DOOR, amount: 1 },
      { name: "sign_pack", title: "Sign", description: "Write a message for visitors.", image: STORE_BUTTONS, imagePos: { x: 2, y: 0 }, cost: 30, itemId: ITEM_ID.SIGN, amount: 1 },
    ],
  ],
  ["player", []],
  ["locks", [{ name: "world_lock", title: "World Lock", description: "Lock an entire world.", image: STORE_BUTTONS, imagePos: { x: 3, y: 0 }, cost: 2000, itemId: ITEM_ID.WORLD_LOCK, amount: 1 }]],
  ["itempacks", []],
  ["creativity", []],
  ["token", []],
]);

function tabButtons(activeTab: string): string {
  return STORE_TABS.map((tab) => `add_tab_button|${tab.id}|${tab.label}|interface/large/btn_shop2.rttex||${tab.id.startsWith(activeTab) ? 1 : 0}|${tab.position}|0|0||||-1|-1|||0|0|\n`).join("");
}

function storeDialog(activeTab: string): string {
  const dialog = new DialogBuilder().defaultColor().raw("enable_tabs|1\n").addSpacer("small").raw(tabButtons(activeTab)).raw("add_banner|interface/large/gui_shop_featured_header.rttex|0|1|\n").addSpacer("small");

  for (const item of storeItems.get(activeTab) ?? []) {
    dialog.addStoreButton(item.name, item.title, item.description, item.image, item.imagePos, item.cost);
  }

  return dialog.endDialog("store_end", "Cancel", "OK").addQuickExit().str();
}

function findStoreItem(name: string): StoreItem | undefined {
  for (const items of storeItems.values()) {
    const item = items.find((entry) => entry.name === name);
    if (item) return item;
  }
  return undefined;
}

/** Opens the in-game store on the main tab. */
export function openStore(player: Player): void {
  player.variants.sendVariant(Variant.from("OnSetVouchers", int32(0)));
  player.variants.sendVariant(Variant.from("OnStoreRequest", storeDialog("main")));
}

/**
 * Handles the `buy` action: either a tab switch or a purchase.
 */
export function handleStoreBuy(player: Player, name: string): void {
  if (storeItems.has(name)) {
    player.variants.sendVariant(Variant.from("OnStoreRequest", storeDialog(name)));
    return;
  }

  const item = findStoreItem(name);
  if (!item) return;

  if (player.gems < item.cost) {
    player.variants.sendVariant(Variant.from("OnStorePurchaseResult", `You can't afford \`w${item.title}\`\`! You need \`w${item.cost - player.gems}\`\` more gems.`));
    return;
  }
  if (!player.inventory.canAddItem(item.itemId, item.amount)) {
    player.variants.sendVariant(Variant.from("OnStorePurchaseResult", "You don't have room in your backpack for that!"));
    return;
  }

  player.setGems(player.gems - item.cost);
  player.addItemInven(item.itemId, item.amount);
  player.variants.sendVariant(Variant.from("OnStorePurchaseResult", `You purchased \`w${item.title}\`\` for \`w${item.cost}\`\` gems.`));
}
