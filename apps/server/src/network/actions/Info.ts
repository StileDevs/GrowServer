import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "@growserver/utils";
import { Variant } from "growtopia.js";
import { ItemsInfo } from "@growserver/types";

export class Info {
  private readonly items = new Map<number, ItemsInfo>();

  constructor(
    public base: Base,
    public peer: Peer,
  ) {
    // Use the already loaded items from Base
    if (base.items.wiki && Array.isArray(base.items.wiki)) {
      base.items.wiki.forEach((it) => {
        this.items.set(it.id, it);
      });
    } else {
      console.error("Items wiki data not loaded properly in Base class");
    }
  }

  public async execute(
    action: NonEmptyObject<Record<string, string>>,
  ): Promise<void> {
    const id = parseInt(action.itemID, 10);
    if (isNaN(id)) return this.sendMessage("Invalid item ID.");
    const item = this.items.get(id);
    if (!item) return this.sendMessage("Item not found.");

    const dlg = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`\`wAbout ${item.name} (${item.id})`, item.id, "small")
      .addSpacer("small")
      .addSmallText(item.desc || "`oNo description available.")
      .addSpacer("small")
      .addSmallText("Rarity: `wTODO");

    if (item.recipe?.splice?.length) {
      const seeds = item.recipe.splice
        .map((sid) => this.items.get(sid)?.name || sid)
        .join(" + ");
      dlg.addSmallText(`Recipe: ${seeds} = ${item.name}`).addSpacer("small");
    }

    // Check if item has combine property via metadata instead
    const itemMeta = this.base.items.metadata.items.get(item.id.toString());
    const hasTransmutation = itemMeta && itemMeta.actionType === 34; // ActionType 34 is commonly used for transmutable items

    if (hasTransmutation) {
      dlg.addSmallText("`oThis item can be transmuted.");
    } else if (!item.recipe?.splice?.length) {
      dlg.addSmallText("`oThis item cannot be spliced.");
    }

    // Check if item is permanent via metadata instead
    const isPermaItem =
      itemMeta &&
      itemMeta.flags !== undefined &&
      (itemMeta.flags & 0x100) === 0x100; // Check for ITEM_UNTRADEABLE flag which often indicates perma items

    if (isPermaItem) {
      dlg
        .addSpacer("small")
        .addSmallText(
          "`3This item can't be destroyed - smashing it will return it to your backpack if you have room!",
        );
    }

    const out = dlg.addButton("info_end", "OK").str();
    this.peer.send(Variant.from("OnDialogRequest", out));
  }
  private sendMessage(msg: string) {
    this.peer.send(Variant.from("OnTextOverlay", msg));
  }
}

export { Info as InfoCommand };
