import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

export class ShopHandler {
  constructor(
    public base: Base,
    public peer: Peer
  ) { }

  public async execute(
    _action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    const tabs = await this.base.database.shop.getTabs();
    const dialog = new DialogBuilder()
      .defaultColor()
      .raw("enable_tabs|1")
      .addSpacer("small");

    tabs.forEach((tab, idx) => {
      dialog
        .raw(
          `add_tab_button|${tab.key}_menu|${tab.label}|interface/large/btn_shop2.rttex||${idx === 0 ? 1 : 0}|${tab.position}|0|0||||-1|-1|||0|0|`
        )
        .addSpacer("small");
    });

    dialog.raw("add_banner|interface/large/gui_shop_featured_header.rttex|0|1|").addSpacer("small");

    const firstKey = tabs[0]?.key;
    if (firstKey) {
      const items = await this.base.database.shop.getItemsByTab(firstKey);
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
    }

    const finalDialog = dialog.endDialog("store_end", "Cancel", "OK").addQuickExit().str();

    this.peer.send(Variant.from("OnSetVouchers", 0), Variant.from("OnStoreRequest", finalDialog));
  }
}
