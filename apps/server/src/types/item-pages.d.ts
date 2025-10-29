import type { ItemDefinition } from "grow-items";

export interface ItemsInfo {
  id: number;
  name: string;
  desc: string;
  recipe?: Recipe;
  func?: ItemInfoFunc;
  playMods?: string[];
  chi?: "earth" | "wind" | "fire" | "water" | "";
}

export interface ItemInfoFunc {
  add: string;
  rem: string;
}

export interface Recipe {
  splice: number[];
}

export interface ItemsPage {
  text?: string;
  items: ItemDefinition[];
}