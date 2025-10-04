import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";
import { type ShopCatalog } from "../../types/shop";
import { getNextBackpackUpgrade, getBackpackMaxSlots, formatNumber } from "../../utils/backpack";
import { isBackpackUpgradeItem } from "../../utils/shop";
import { SHOP_TABS_ORDER, SHOP_TAB_INDEX, SHOP_WEATHER_TAB_DESC, SHOP_LABEL_TO_CATEGORY } from "../../Constants";
import consola from "consola";


type ShopItem = {
  name: string;
  title: string;
  description: string;
  image?: string;
  imagePos?: { x: number; y: number };
  cost?: string | number;
  itemId?: number;
};

export class ShopBuy {
  private catalog: ShopCatalog | null = null; // Populated from DB per request

  constructor(
    public base: Base,
    public peer: Peer
  ) { }

  private async createTabButtons(activeKey: string): Promise<string> {
    const tabs = await this.base.database.shop.getTabs();

    const byKey = new Map(tabs.map(t => [t.key, t] as const));

    const lines = SHOP_TABS_ORDER
      .map((key) => byKey.get(key))
      .filter((t): t is typeof tabs[number] => Boolean(t))
      .map((tab) => {
        const isActive = tab.key === activeKey ? 1 : 0;
        const desc = tab.key === "weather"
          ? SHOP_WEATHER_TAB_DESC
          : "";
        const positionIndex = SHOP_TAB_INDEX[tab.key] ?? 0;
        return `add_tab_button|${tab.key}_menu|${tab.label}|interface/large/btn_shop2.rttex|${desc}|${isActive}|${positionIndex}|0|0||||-1|-1|||0|0|CustomParams:|\n`;
      });
    const dialog = new DialogBuilder();
    lines.forEach((line) => dialog.raw(line).addSpacer("small"));
    return dialog.str();
  }

  findShopItemByName(name: string): ShopItem | undefined {
    const catalog = this.catalog as ShopCatalog;
    for (const category in catalog.items) {
      const item = catalog.items[category].find(item => item.name === name) as ShopItem | undefined;
      if (item) {
        return item;
      }
    }
    return undefined;
  }

  private async addShopItems(
    dialog: DialogBuilder,
    category: string
  ): Promise<DialogBuilder> {
    const items = await this.base.database.shop.getItemsByTab(category);
    items.forEach((item) => {
      const displayCost = item.currency === "GROWTOKEN" ? -(item.cost ?? 0) : (item.cost ?? 0);
      dialog.addStoreButton(
        item.name,
        item.title,
        item.description,
        item.image || "",
        { x: item.imageX, y: item.imageY },
        displayCost
      );
    });
    return dialog;
  }

  private async createShopDialog(activeKey: string, category: string): Promise<string> {
    const dialog = new DialogBuilder()
      .defaultColor()
      .raw("enable_tabs|1")
      .addSpacer("small")
      .raw(await this.createTabButtons(activeKey));

    const shouldAddBanner = activeKey === "main";
    if (shouldAddBanner) {
      dialog.raw("add_banner|interface/large/gui_shop_featured_header.rttex|0|1|").addSpacer("small");
    }

    await this.addShopItems(dialog, category);

    return dialog.endDialog("store_end", "Cancel", "OK").addQuickExit().str();
  }

  public async execute(
    action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {

    const labelToCategory: Record<string, string> = SHOP_LABEL_TO_CATEGORY;

    // Normalize item: tabs come through as `${tab.key}_menu`
    const rawItem = action.item;
    const requested = typeof rawItem === "string" ? rawItem.replace(/_menu$/, "") : undefined;
    const isTabSwitch = requested !== undefined && requested in labelToCategory;

    if (isTabSwitch) {
      const category = labelToCategory[requested];
      const activeKey = category ?? (await this.base.database.shop.getTabs()).at(0)?.key ?? "main";
      const selectedCategory = category ?? activeKey;
      //
      const dialog = await this.createShopDialog(activeKey, selectedCategory);
      this.peer.send(Variant.from("OnSetVouchers", 0)
      );
      this.peer.send(Variant.from("OnStoreRequest", dialog));
      return;
    }

    if (!requested) {
      // Safety: if nothing requested, just re-open the first tab to avoid undefined DB arg
      const firstKey = (await this.base.database.shop.getTabs()).at(0)?.key ?? "main";
      //
      const dialog = await this.createShopDialog(firstKey, firstKey);
      this.peer.send(Variant.from("OnSetVouchers", 0)
      );
      this.peer.send(Variant.from("OnStoreRequest", dialog));
      return;
    }

    const itemRow = await this.base.database.shop.getItemByName(requested);
    if (!itemRow) return;

    // IAP URL case - show URL info
    if (itemRow.iapUrl) {
      this.peer.send(Variant.from("OnConsoleMessage", `Open this URL to purchase: ${itemRow.iapUrl}`));
      this.peer.send(Variant.from("OnStorePurchaseResult", `Open this URL to purchase: ${itemRow.iapUrl}`));
      return;
    }

    if (isBackpackUpgradeItem(itemRow)) {
      const currentSlots = this.peer.data.inventory.max;
      const maxSlots = getBackpackMaxSlots();
      if (currentSlots >= maxSlots) {
        this.peer.send(Variant.from("OnConsoleMessage", `You have reached the maximum backpack capacity (${maxSlots} slots).`));
        this.peer.send(Variant.from("OnStorePurchaseResult", `You have reached the maximum backpack capacity (${maxSlots} slots).`));
        return;
      }

      const next = getNextBackpackUpgrade(currentSlots);
      if (!next) {
        this.peer.send(Variant.from("OnConsoleMessage", `You have reached the maximum backpack capacity (${maxSlots} slots).`));
        this.peer.send(Variant.from("OnStorePurchaseResult", `You have reached the maximum backpack capacity (${maxSlots} slots).`));
        return;
      }

      // Override any DB-set price with dynamic tier price
      const price = next.price;
      const playerGems = this.peer.data.gems ?? 0;
      if (playerGems < price) {
        const short = price - playerGems;
        const itemTitle = itemRow.title;
        const msg = `You can't afford \`o${itemTitle}\`\`!  You're \`$${formatNumber(short)}\`\` Gems short.`;
        this.peer.send(Variant.from("OnConsoleMessage", msg));
        this.peer.send(Variant.from("OnStorePurchaseResult", msg));
        return;
      }

      // Deduct gems and apply upgrade to next tier
      this.peer.data.gems = (this.peer.data.gems ?? 0) - price;
      this.peer.setGems(this.peer.data.gems);
      this.peer.data.inventory.max = Math.min(next.nextSlots, maxSlots);
      this.peer.inventory();

      const purchasedLine = `You've purchased ${itemRow.title} for ${formatNumber(price)} gems.`;
      const remainingLine = `You have ${formatNumber(this.peer.data.gems ?? 0)} Gems left.`;
      const effectLine = `Your backpack capacity increased to ${this.peer.data.inventory.max} slots.`;
      this.peer.send(Variant.from("OnStorePurchaseResult", `${purchasedLine}\n${remainingLine}\n\n\`5${effectLine}`));

      this.peer.saveToCache();
      this.peer.saveToDatabase();
      return;
    }

    const cost = Number(itemRow.cost ?? 0) || 0;
    if (itemRow.currency === "GROWTOKEN") {
      const haveTokens = this.peer.data.growtokens ?? 0;
      if (haveTokens < cost) {
        const short = cost - haveTokens;
        const itemTitle = itemRow.title;
        const msg = `You can't afford \`o${itemTitle}\`\`!  You're \`$${formatNumber(short)}\`\` Growtokens short.`;
        this.peer.send(Variant.from("OnConsoleMessage", msg));
        this.peer.send(Variant.from("OnStorePurchaseResult", msg));
        return;
      }
    } else if (itemRow.currency === "GEMS") {
      const haveGems = this.peer.data.gems ?? 0;
      if (haveGems < cost) {
        const short = cost - haveGems;
        const itemTitle = itemRow.title;
        const msg = `You can't afford \`o${itemTitle}\`\`!  You're \`$${formatNumber(short)}\`\` Gems short.`;
        this.peer.send(Variant.from("OnConsoleMessage", msg));
        this.peer.send(Variant.from("OnStorePurchaseResult", msg));
        return;
      }
    }

    const rewardsRows = await this.base.database.shop.getRewardsByName(itemRow.name);
    const rewards = rewardsRows?.map(r => ({ itemId: r.rewardItemId, amount: r.amount }));
    if (rewards && rewards.length > 0) {
      // Cumulative capacity check: ensure all new unique rewards fit at once
      const inventoryItems = this.peer.data.inventory.items;
      const currentSlots = inventoryItems.length;
      const maxSlots = this.peer.data.inventory.max;
      const freeSlots = Math.max(0, maxSlots - currentSlots);
      const newUniqueRewards = rewards.filter((r) => !inventoryItems.some((i) => i.id === r.itemId)).length;
      if (newUniqueRewards > freeSlots) {
        this.peer.send(Variant.from("OnConsoleMessage", "`4Your inventory is full. Make some space and try again."));
        this.peer.send(Variant.from("OnStorePurchaseResult", "`4Your inventory is full. Make some space and try again."));
        return;
      }
      for (const reward of rewards) {
        if (!this.peer.canAddItemToInv(reward.itemId, reward.amount)) {
          this.peer.send(Variant.from("OnConsoleMessage", "`4Your inventory is full. Make some space and try again."));
          this.peer.send(Variant.from("OnStorePurchaseResult", "`4Your inventory is full. Make some space and try again."));
          return;
        }
      }
      for (const reward of rewards) {
        this.peer.addItemInven(reward.itemId, reward.amount);
      }
    } else {
      const legacyItemId = (itemRow as unknown as { itemId?: number }).itemId;
      if (legacyItemId) {
        // Capacity check for legacy single-item purchases
        const alreadyHas = Boolean(this.peer.searchItem?.(legacyItemId));
        if (!alreadyHas && this.peer.data.inventory.items.length >= this.peer.data.inventory.max) {
          this.peer.send(Variant.from("OnConsoleMessage", "`4Your inventory is full. Make some space and try again."));
          this.peer.send(Variant.from("OnStorePurchaseResult", "`4Your inventory is full. Make some space and try again."));
          return;
        }
        this.peer.addItemInven(legacyItemId, 1);
      }
    }

    if (itemRow.currency === "GROWTOKEN") {
      this.peer.data.growtokens = (this.peer.data.growtokens ?? 0) - cost;
      this.peer.setGrowtokens(this.peer.data.growtokens);
    } else if (itemRow.currency === "GEMS") {
      this.peer.data.gems = (this.peer.data.gems ?? 0) - cost;
      this.peer.setGems(this.peer.data.gems);
    }

    // Build OnStorePurchaseResult body like official client
    const receivedList: Array<{ name: string; amount: number }> = [];
    if (rewards && rewards.length > 0) {
      for (const reward of rewards) {
        const meta = this.base.items.metadata.items.get(String(reward.itemId));
        const itemName = meta?.name ?? `Item ${reward.itemId}`;
        receivedList.push({ name: itemName, amount: reward.amount });
      }
    } else {
      const legacyItemId = (itemRow as unknown as { itemId?: number }).itemId;
      if (legacyItemId) {
        const meta = this.base.items.metadata.items.get(String(legacyItemId));
        const itemName = meta?.name ?? `Item ${legacyItemId}`;
        receivedList.push({ name: itemName, amount: 1 });
      }
    }

    const formatNum = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-US") : String(n));
    const currencyLower = itemRow.currency === "GEMS" ? "gems" : "growtokens";
    const currencyTitle = itemRow.currency === "GEMS" ? "Gems" : "Growtokens";
    const purchasedLine = `You've purchased ${itemRow.title} for ${formatNum(cost)} ${currencyLower}.`;
    const remaining = (itemRow.currency === "GEMS" ? (this.peer.data.gems ?? 0) : (this.peer.data.growtokens ?? 0));
    const remainingLine = `You have ${formatNum(remaining)} ${currencyTitle} left.`;

    let body = `${purchasedLine}\n${remainingLine}`;
    if (receivedList.length > 0) {
      const receivedText = receivedList
        .map((it) => (it.amount > 1 ? `${it.amount} ${it.name}` : it.name))
        .join(", ");
      body += `\n\n\`5Received: \`\`${receivedText}`;
    }

    this.peer.send(Variant.from("OnStorePurchaseResult", body));

    this.peer.saveToCache();
    this.peer.saveToDatabase();
  }
}
