import { type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, and, sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Lightweight table definitions to query without a separate schema file
export const shopTabs = sqliteTable("shop_tabs", {
  key:      text("key").notNull(),
  label:    text("label").notNull(),
  position: integer("position").notNull(),
  enabled:  integer("enabled").notNull(),
});

export const shopItems = sqliteTable("shop_items", {
  tabKey:      text("tab_key").notNull(),
  name:        text("name").notNull(),
  title:       text("title").notNull(),
  description: text("description").notNull(),
  image:       text("image"),
  imageX:      integer("image_x").notNull(),
  imageY:      integer("image_y").notNull(),
  currency:    text("currency").notNull(),
  cost:        integer("cost").notNull(),
  iapUrl:      text("iap_url"),
  dialogCmd:   text("dialog_cmd"),
  sortOrder:   integer("sort_order").notNull(),
  enabled:     integer("enabled").notNull(),
});

export const shopItemRewards = sqliteTable("shop_item_rewards", {
  tabKey:       text("tab_key").notNull(),
  itemName:     text("item_name").notNull(),
  rewardItemId: integer("reward_item_id").notNull(),
  amount:       integer("amount").notNull(),
});

export class ShopDB {
  constructor(private db: LibSQLDatabase<Record<string, never>>) { }

  public async getTabs() {
    const rows = await this.db
      .select()
      .from(shopTabs)
      .where(eq(shopTabs.enabled, 1))
      .orderBy(shopTabs.position)
      .execute();
    return rows;
  }

  public async getItemsByTab(tabKey: string) {
    const rows = await this.db
      .select()
      .from(shopItems)
      .where(and(eq(shopItems.tabKey, tabKey), eq(shopItems.enabled, 1)))
      .orderBy(shopItems.sortOrder)
      .execute();
    return rows;
  }

  public async getRewards(tabKey: string, itemName: string) {
    const rows = await this.db
      .select()
      .from(shopItemRewards)
      .where(and(eq(shopItemRewards.tabKey, tabKey), eq(shopItemRewards.itemName, itemName)))
      .execute();
    return rows;
  }

  public async getItemByName(name: string) {
    const rows = await this.db
      .select()
      .from(shopItems)
      .where(eq(shopItems.name, name))
      .orderBy(shopItems.sortOrder)
      .limit(1)
      .execute();
    return rows[0];
  }

  public async getRewardsByName(name: string) {
    const rows = await this.db
      .select()
      .from(shopItemRewards)
      .where(eq(shopItemRewards.itemName, name))
      .execute();
    return rows;
  }
}


