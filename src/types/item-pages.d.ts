import type { ItemDefinition } from "growtopia.js";

export interface ItemsInfo {
  id: number;
  name: string;
  desc: string;
  recipe?: Recipe;
  func?: ItemInfoFunc;
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