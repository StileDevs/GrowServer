import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";
import { SHOP_TABS_ORDER, SHOP_TAB_INDEX, SHOP_WEATHER_TAB_DESC } from "../../Constants";

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

    const byKey = new Map(tabs.map(t => [t.key, t] as const));
    // Choose default active: prefer main, else first available in order
    const activeKey = byKey.has("main")
      ? "main"
      : (SHOP_TABS_ORDER.find(k => byKey.has(k)) ?? tabs[0]?.key ?? "main");

    SHOP_TABS_ORDER
      .map((key) => byKey.get(key))
      .filter((t): t is typeof tabs[number] => Boolean(t))
      .forEach((tab) => {
        const isActive = tab.key === activeKey ? 1 : 0;
        const desc = tab.key === "weather" ? SHOP_WEATHER_TAB_DESC : "";
        const positionIndex = SHOP_TAB_INDEX[tab.key] ?? 0;
        dialog
          .raw(
            `add_tab_button|${tab.key}_menu|${tab.label}|interface/large/btn_shop2.rttex|${desc}|${isActive}|${positionIndex}|0|0||||-1|-1|||0|0|CustomParams:|\n`
          )
          .addSpacer("small");
      });

    dialog.raw("add_banner|interface/large/gui_shop_featured_header.rttex|0|1|").addSpacer("small");

    if (activeKey) {
      const items = await this.base.database.shop.getItemsByTab(activeKey);
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
