import { NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

import itemsInfo from "../../../assets/ItemInfoClean.json";

interface ItemData {
  id: number;
  name: string;
  chi: string;
  desc: string;
  type: string;
  Hardness: string;
  GrowTime: string;
  rarity: string;
  recipe: {
    splice: number[];
    combine: number[];
  };
}

export class ItemInfo {
  private items: Map<number, ItemData>;

  constructor(
    public base: Base,
    public peer: Peer
  ) {
    this.items = new Map(itemsInfo.map((item: ItemData) => [item.id, item]));
  }

  public async execute(action: NonEmptyObject<Record<string, string>>): Promise<void> {
    const itemID = parseInt(action.itemID);

    if (itemID === 32) {
      this.peer.send(
        Variant.from("OnConsoleMessage", "This item cannot be inspected.")
      );
      return;
    }

    if (isNaN(itemID)) {
      this.peer.send(
        Variant.from("OnConsoleMessage", "Invalid item ID.")
      );
      return;
    }

    const item = this.items.get(itemID);

    if (!item) {
      this.peer.send(
        Variant.from("OnConsoleMessage", "Item information not found.")
      );
      return;
    }

    this.peer.send(
      Variant.from("OnDialogRequest", this.buildDialog(item))
    );
  }

  private buildDialog(item: ItemData): string {
    const isSeed = item.name.toLowerCase().includes("seed");
    const displayName = isSeed
      ? `Seed of ${item.name.replace(" Seed", "")}`
      : item.name;

    const db = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`About ${displayName}`, item.id.toString(), "big")
      .addSmallText(`Item ID: ${item.id}`);

    db.addSpacer("medium");

    const description = item.desc || "No description available.";
    db.addSmallText(`\`o${this.cleanDescription(description)}`);

    db.addSpacer("small");

    if (isSeed) {
      db.addSmallText(`\`wGrow Time: ${item.GrowTime || "N/A"}`);
    } else {
      db.addSmallText(`\`wDurability: ${item.Hardness || "N/A"}`);
    }

    const isFarmable = item.recipe.splice.length > 0;
    db.addSmallText(`\`wFarmable: ${isFarmable ? "Yes" : "No"}`);

    if (isFarmable) {
      db.addSpacer("medium");
      const ingredients = item.recipe.splice
        .map(id => this.items.get(id)?.name || `Unknown Item (${id})`)
        .join(" + ");
      db.addSmallText(`\`wRecipe: ${ingredients}`);
    }

    return db.endDialog("iteminfo_close", "Close", "OK").str();
  }

  private cleanDescription(text: string): string {
    return text
      .replace(/\s{2,}/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
  }
}

export { ItemInfo as Info };
