export type StoreCurrency = "GEMS" | "GROWTOKEN" | "IAP_URL" | "NONE";

export type StoreActionType = "GRANT_ITEMS" | "OPEN_URL" | "OPEN_DIALOG" | "NONE";

export interface StoreRewardItem {
  itemId: number;
  amount: number;
}

export interface StoreAction {
  type: StoreActionType;
  // When type is GRANT_ITEMS
  rewards?: StoreRewardItem[];
  // When type is OPEN_URL
  url?: string;
  // When type is OPEN_DIALOG
  dialogCommand?: string;
}

export interface StoreItemConfig {
  name: string; // internal id used in action|buy item|<name>
  title: string; // display title
  description: string; // display description (can be empty)
  image?: string; // rttex path
  imagePos?: { x: number; y: number }; // frame coords
  cost?: number; // positive for gems, negative for growtoken, 0 for free
  currency?: StoreCurrency; // overrides cost sign inference
  action?: StoreAction; // purchase behavior
}

export interface StoreTabConfig {
  id: string; // e.g., main_menu
  label: string; // e.g., Home
  key: string; // category key used internally, e.g., main, locks
  position: number; // order
}

export interface StoreCatalog {
  tabs: StoreTabConfig[];
  items: Record<string, StoreItemConfig[]>; // keyed by tab key
}


