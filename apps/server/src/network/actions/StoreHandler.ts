import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

type StoreItem = {
  name: string;
  title: string;
  description: string;
  image?: string;
  imagePos?: { x: number; y: number };
  cost?: string | number;
};

// Add items here
export class StoreHandler {
  private readonly mainItems: StoreItem[] = [
    {
      name:        "test",
      title:       "Handler Test",
      description: "hmmmmmm",
      image:       "interface/large/store_buttons/store_buttons.rttex",
      imagePos:    { x: 0, y: 0 },
      cost:        20000
    },
    {
      name:        "test",
      title:       "Handler Test",
      description: "hmmmmmmmmmmmm",
      image:       "interface/large/store_buttons/store_buttons.rttex",
      imagePos:    { x: 1, y: 0 },
      cost:        15000
    }
  ];

  constructor(
    public base: Base,
    public peer: Peer
  ) {}

  private addMainItems(dialog: DialogBuilder): DialogBuilder {
    this.mainItems.forEach((item) => {
      dialog.addStoreButton(
        item.name,
        item.title,
        item.description,
        item.image || "",
        item.imagePos || { x: 0, y: 0 },
        item.cost || ""
      );
    });
    return dialog;
  }

  public async execute(
    _action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    const dialog = new DialogBuilder()
      .defaultColor()
      .raw("enable_tabs|1")
      .addSpacer("small")
      // Tabs
      .raw(
        "add_tab_button|main_menu|main|interface/large/btn_shop2.rttex||1|0|0|0||||-1|-1|||0|0|"
      )
      .addSpacer("small")
      .raw(
        "add_tab_button|player_menu|player|interface/large/btn_shop2.rttex||0|1|0|0||||-1|-1|||0|0|"
      )
      .addSpacer("small")
      .raw(
        "add_tab_button|locks_menu|packs|interface/large/btn_shop2.rttex||0|3|0|0||||-1|-1|||0|0|"
      )
      .addSpacer("small")
      .raw(
        "add_tab_button|itempacks_menu|bigitems|interface/large/btn_shop2.rttex||0|4|0|0||||-1|-1|||0|0|"
      )
      .addSpacer("small")
      .raw(
        "add_tab_button|creativity_menu|weather|interface/large/btn_shop2.rttex||0|5|0|0||||-1|-1|||0|0|"
      )
      .addSpacer("small")
      .raw(
        "add_tab_button|token_menu|growtoken|interface/large/btn_shop2.rttex||0|2|0|0||||-1|-1|||0|0|"
      )
      .addSpacer("small")
      .raw("add_banner|interface/large/gui_shop_featured_header.rttex|0|1|")
      .addSpacer("small");
    // Items
    this.addMainItems(dialog);

    const finalDialog = dialog
      .endDialog("store_end", "Cancel", "OK")
      .addQuickExit()
      .str();

    this.peer.send(
      Variant.from("OnSetVouchers", 0),
      Variant.from("OnStoreRequest", finalDialog)
    );
  }
}
