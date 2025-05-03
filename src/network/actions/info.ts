// src/network/actions/Info.ts
import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";
import itemsInfo from "../../../assets/items_info_new.json";

interface ItemData {
  id: number;
  name: string;
  desc: string;
  perma?: boolean;
  recipe?: {
    splice: number[];
    combine?: number[];
  };
}

export class Info {
  private readonly items = new Map<number, ItemData>();

  constructor(
    public base: Base,
    public peer: Peer
  ) {
    (itemsInfo as ItemData[]).forEach(it => {
      this.items.set(it.id, {
        id:     it.id,
        name:   it.name,
        desc:   it.desc,
        perma:  it.perma,
        recipe: it.recipe
      });
    });
  }

  public async execute(
    action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    const id = parseInt(action.itemID, 10);
    if (isNaN(id)) return this.sendMessage("Invalid item ID.");

    const item = this.items.get(id);
    if (!item) return this.sendMessage("Item not found.");

    const dlg = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`About ${item.name} (${item.id})`, item.id, "big")
      .addSpacer("small")
      .addSmallText(item.desc)
      .addSpacer("small");

    if (item.recipe?.splice?.length) {
      const seeds = item.recipe.splice
        .map(sid => this.items.get(sid)?.name || sid)
        .join(" + ");
      dlg.addSmallText(`Recipe: ${seeds} = ${item.name}`)
        .addSpacer("small");
    }

    if (item.recipe?.combine?.length) {
      dlg.addSmallText("`3this item can be transmuted.");
    } else if (item.recipe?.splice?.length) {
      dlg.addSmallText("`3this item can be spliced.");
    }

    if (item.perma) {
      dlg.addSpacer("small")
        .addSmallText("`3this is a perma item—destroying it will return it to your inventory if you have room.");
    }

    const out = dlg.endDialog("info_end", "Close", "").str();
    this.peer.send(Variant.from("OnDialogRequest", out));
  }

  private sendMessage(msg: string) {
    this.peer.send(Variant.from("OnConsoleMessage", msg));
  }
}

export { Info as InfoCommand };
