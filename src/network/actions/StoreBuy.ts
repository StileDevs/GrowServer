import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";
import { ActionTypes } from "../../Constants";

type TabConfig = {
  id: string;
  label: string;
  position: number;
};

type StoreItem = {
  name: string;
  title: string;
  description: string;
  image?: string;
  imagePos?: { x: number; y: number };
  cost?: string | number;
  itemId?: number;
};

export class StoreBuy {
  private readonly tabs: TabConfig[] = [
    { id: "main_menu", label: "main", position: 0 },
    { id: "player_menu", label: "player", position: 1 },
    { id: "token_menu", label: "growtoken", position: 2 },
    { id: "locks_menu", label: "packs", position: 3 },
    { id: "itempacks_menu", label: "bigitems", position: 4 },
    { id: "creativity_menu", label: "weather", position: 5 }
  ];

  private readonly storeItems: Record<string, StoreItem[]> = {
    main: [
      {

        name:        "test_store1",
        title:       "After swtich tab",
        description: "Hello",
        image:       "interface/large/store_buttons/store_buttons.rttex",
        imagePos:    { x: 1, y: 1 },
        cost:        2,
        itemId:      4272
      },
      {
        name:        "wooden_background",
        title:       "Wooden Background",
        description: "Hello",
        image:       "interface/large/store_buttons/store_buttons.rttex",
        imagePos:    { x: 1, y: 0 },
        cost:        20,
        itemId:      52
      }
    ],
    player: [
      {
        name:        "test_store3",
        title:       "Test",
        description: "Hello",
        image:       "interface/large/store_buttons/store_buttons.rttex",
        imagePos:    { x: 2, y: 0 },
        cost:        50,
        itemId:      4272
      }
    ],
    locks: [
      {
        name:        "test_store4",
        title:       "Test",
        description: "Hello",
        image:       "interface/large/store_buttons/store_buttons.rttex",
        imagePos:    { x: 3, y: 0 },
        cost:        5,
        itemId:      4272
      }
    ],
    itempacks: [
      {
        name:        "test_store5",
        title:       "Test",
        description: "Hello",
        image:       "interface/large/store_buttons/store_buttons.rttex",
        imagePos:    { x: 4, y: 0 },
        cost:        1,
        itemId:      4272
      }
    ],
    creativity: [
      {
        name:        "test_store6",
        title:       "Test",
        description: "Hello",
        image:       "interface/large/store_buttons/store_buttons.rttex",
        imagePos:    { x: 5, y: 0 },
        cost:        15,
        itemId:      4272
      }
    ],
    token: [
      {
        name:        "test_store7",
        title:       "Test",
        description: "Hello",
        image:       "interface/large/store_buttons/store_buttons.rttex",
        imagePos:    { x: 6, y: 0 },
        cost:        10,
        itemId:      4272
      }
    ]
  };

  constructor(
    public base: Base,
    public peer: Peer
  ) { }

  private createTabButtons(activeTab: string): string {
    const buttons = this.tabs.map((tab) => {
      const isActive = tab.id.startsWith(activeTab) ? 1 : 0;
      return `add_tab_button|${tab.id}|${tab.label}|interface/large/btn_shop2.rttex||${isActive}|${tab.position}|0|0||||-1|-1|||0|0|\n`;
    });

    const dialog = new DialogBuilder();
    buttons.forEach((button) => dialog.raw(button).addSpacer("small"));
    return dialog.str();
  }

  findStoreItemByName(name: string): StoreItem | undefined {
    for (const category in this.storeItems) {
      const item = this.storeItems[category].find(item => item.name === name);
      if (item) {
        return item;
      }
    }
    return undefined;
  }

  private addStoreItems(
    dialog: DialogBuilder,
    category: string
  ): DialogBuilder {
    const items = this.storeItems[category] || [];
    items.forEach((item) => {
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

  private createStoreDialog(activeTab: string): string {
    const dialog = new DialogBuilder()
      .defaultColor()
      .raw("enable_tabs|1")
      .addSpacer("small")
      .raw(this.createTabButtons(activeTab))
      .raw("add_banner|interface/large/gui_shop_featured_header.rttex|0|1|")
      .addSpacer("small");

    this.addStoreItems(dialog, activeTab);

    return dialog.endDialog("store_end", "Cancel", "OK").addQuickExit().str();
  }

  public async execute(
    action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    const validTabs = [
      "main",
      "player",
      "locks",
      "itempacks",
      "creativity",
      "token"
    ];

    const dialog = this.createStoreDialog(action.item);

    this.peer.send(Variant.from("OnStoreRequest", dialog));
    this.peer.send(Variant.from("OnStorePurchaseResult"));
    const actionItem = this.findStoreItemByName(action.item);
    if ((!validTabs.includes(action.item) && this.findStoreItemByName(action.item))) {
      this.peer.addItemInven(actionItem?.itemId as number, 1);
      this.peer.data.gems -= (actionItem?.cost as number) ?? 0
      this.peer.send("OnSetBux", this.peer.data.gems)
    }

    this.peer.saveToCache();
    this.peer.saveToDatabase();
  }
}
