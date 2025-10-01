export type ShopCurrency = "GEMS" | "GROWTOKEN" | "IAP_URL" | "NONE";

export type ShopActionType = "GRANT_ITEMS" | "OPEN_URL" | "OPEN_DIALOG" | "NONE";

export interface ShopRewardItem {
  itemId: number;
  amount: number;
}

export interface ShopAction {
  type: ShopActionType;
  // When type is GRANT_ITEMS
  rewards?: ShopRewardItem[];
  // When type is OPEN_URL
  url?: string;
  // When type is OPEN_DIALOG
  dialogCommand?: string;
}

export interface ShopItemConfig {
  name: string; // internal id used in action|buy item|<name>
  title: string; // display title
  description: string; // display description (can be empty)
  image?: string; // rttex path
  imagePos?: { x: number; y: number }; // frame coords
  cost?: number; // positive for gems, negative for growtoken, 0 for free
  currency?: ShopCurrency; // overrides cost sign inference
  action?: ShopAction; // purchase behavior
}

export interface ShopTabConfig {
  id: string; // e.g., main_menu
  label: string; // e.g., Home
  key: string; // category key used internally, e.g., main, locks
  position: number; // order
}

export interface ShopCatalog {
  tabs: ShopTabConfig[];
  items: Record<string, ShopItemConfig[]>; // keyed by tab key
}


