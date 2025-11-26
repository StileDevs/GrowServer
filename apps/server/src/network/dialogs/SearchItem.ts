import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { Variant } from "growtopia.js";

export class SearchItem {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      buttonClicked: string;
    }>,
  ) {}

  public async execute(): Promise<void> {
    if (!this.action.dialog_name || !this.action.buttonClicked) return;

    // Parse the searchableItemListButton format: searchableItemListButton_{itemID}_{index}_{param}
    // Example: searchableItemListButton_14992_0_-1
    let itemID: number;

    if (this.action.buttonClicked.startsWith("searchableItemListButton_")) {
      const parts = this.action.buttonClicked.split("_");
      if (parts.length >= 2) {
        itemID = parseInt(parts[1]);
      } else {
        return;
      }
    } else {
      itemID = parseInt(this.action.buttonClicked);
    }

    // Check if valid item
    const item = this.base.items.metadata.items.get(itemID.toString());
    if (!item) {
      this.peer.send(
        Variant.from("OnConsoleMessage", "`4Error: Invalid item ID.``"),
      );
      return;
    }

    // Add item to inventory
    this.peer.addItemInven(itemID, 200);
    this.peer.send(
      Variant.from(
        "OnConsoleMessage",
        `Added \`6${item.name}\`\` (200) to your inventory.`,
      ),
    );
    this.peer.saveToCache();
  }
}
