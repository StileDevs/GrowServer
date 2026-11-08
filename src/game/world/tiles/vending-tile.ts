import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import type { Vending } from "../types";
import { BlockFlags, ITEM_ID, TileExtraTypes, TileFlags } from "../constants";

/** World locks one diamond lock is worth. */
export const DIAMOND_LOCK_VALUE = 100;
/** World locks one blue gem lock is worth. */
export const BLUE_GEM_LOCK_VALUE = 10_000;

/** World locks a player holds, counting diamond (100) and blue gem (10000) locks. */
export function countWorldLocks(player: Player): number {
  const amount = (id: number) => player.inventory.getAmount(id);
  return amount(ITEM_ID.WORLD_LOCK) + amount(ITEM_ID.DIAMOND_LOCK) * DIAMOND_LOCK_VALUE + amount(ITEM_ID.BLUE_GEM_LOCK) * BLUE_GEM_LOCK_VALUE;
}

/**
 * Vending machines. Extra data: u8 type, u32 item id, i32 price
 * (> 0 world locks per item, < 0 items per world lock, 0 not for sale).
 */
export class VendingTile extends Tile {
  public extraType = TileExtraTypes.VENDING_MACHINE;

  /** The machine state, created on demand for machines placed before this handler existed. */
  public get vending(): Vending {
    if (!this.data.vending) this.data.vending = { itemId: 0, count: 0, price: 0, earned: 0 };
    return this.data.vending;
  }

  /** Whether the player may stock, price and empty the machine. */
  public canEdit(player: Player): boolean {
    if (player.isDeveloper) return true;
    const tileOwner = this.world.getTileOwnerPlayerId(this.data);
    if (tileOwner !== undefined && tileOwner === player.playerId) return true;
    const worldOwner = this.world.getOwnerPlayerId();
    return worldOwner !== undefined && worldOwner === player.playerId;
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.vending = { itemId: 0, count: 0, price: 0, earned: 0 };
    return true;
  }

  public override async onPunch(player: Player): Promise<boolean> {
    if (this.vending.count > 0 || this.vending.earned > 0) {
      player.sendTextBubble("Empty the machine before smashing!", true);
      return false;
    }
    return super.onPunch(player);
  }

  public override async onDestroy(player: Player): Promise<void> {
    this.returnContents(player);
    await super.onDestroy(player);
    delete this.data.vending;
  }

  public override async onWrench(player: Player): Promise<boolean> {
    // Buyers wrench the machine too, so only the item flag is checked here.
    const itemMeta = getItem(this.data.fg);
    if (!itemMeta || !((itemMeta.flags ?? 0) & BlockFlags.WRENCHABLE)) return false;

    if (!this.isPlayerOnMachine(player)) {
      player.sendTextBubble("Get closer!", false);
      return false;
    }

    this.sendDialog(player);
    return true;
  }

  /**
   * Whether the player's avatar stands in this tile. The machine can only be
   * used from inside it, like the real game ("Get closer!").
   */
  public isPlayerOnMachine(player: Player): boolean {
    const centerX = Math.floor((player.state.x + 10) / 32);
    const centerY = Math.floor((player.state.y + 15) / 32);
    return centerX === this.data.x && centerY === this.data.y;
  }

  /** Owner view (stock, price, withdraw) or buyer view. */
  public sendDialog(player: Player): void {
    const dialog = this.canEdit(player) ? this.ownerDialog(player) : this.buyerDialog(player);
    player.variants.sendOnDialogRequest(dialog.str());
  }

  // The client lights the machine up when it holds an item.
  public override serializedFlags(flags: number): number {
    return this.vending.itemId ? flags | TileFlags.OPEN : flags;
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(this.extraType);
    buffer.writeU32(this.vending.itemId);
    buffer.writeI32(this.vending.price);
  }

  /**
   * Hands the stock and earnings back to the owner before the machine is
   * removed. Whatever does not fit in the backpack is dropped on the tile.
   */
  private returnContents(player: Player): void {
    const v = this.data.vending;
    if (!v || (v.count <= 0 && v.earned <= 0)) return;

    const ownerId = this.world.getTileOwnerPlayerId(this.data);
    const owner = this.world.players.find((other) => other.playerId === ownerId) ?? (this.canEdit(player) ? player : undefined);

    const give = (itemId: number, amount: number) => {
      if (amount <= 0) return;
      const added = owner ? owner.addItemInven(itemId, amount) : 0;
      const rest = amount - added;
      if (rest > 0) this.world.drop(player, this.data.x * 32 + 8, this.data.y * 32 + 8, itemId, rest, { tree: true });
    };

    give(v.itemId, v.count);
    give(ITEM_ID.DIAMOND_LOCK, Math.floor(v.earned / DIAMOND_LOCK_VALUE));
    give(ITEM_ID.WORLD_LOCK, v.earned % DIAMOND_LOCK_VALUE);

    v.itemId = 0;
    v.count = 0;
    v.price = 0;
    v.earned = 0;
  }

  private baseDialog(): DialogBuilder {
    const machine = getItem(this.data.fg);
    return new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon(`\`w${machine?.name ?? "Vending Machine"}\`\``, this.data.fg, "big")
      .addSpacer("small")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y);
  }


  /** Human readable offer, e.g. "3 World Locks each" or "25 per World Lock". */
  private priceText(): string {
    const v = this.vending;
    if (v.price === 0) return "`4not for sale``";
    if (v.price > 0) return `\`w${v.price} World Lock${v.price === 1 ? "" : "s"}\`\` each`;
    return `\`w${-v.price}\`\` per World Lock`;
  }

  /**
   * Owner view: stock, price and earnings with the management buttons, or an
   * item picker while the machine is empty.
   */
  private ownerDialog(player: Player): DialogBuilder {
    const v = this.vending;
    const dialog = this.baseDialog();

    if (v.itemId === 0 || v.count <= 0) {
      dialog.addTextBox("This machine is empty.").addItemPicker("stockitem", "`wPut an item in``", "Choose an item to put in the machine!");
      if (v.earned > 0) {
        dialog.addSpacer("small").addTextBox(`\`oEarnings: \`w${v.earned} World Locks\`\``).addButton("withdraw", "`2Collect earnings``");
      }
      return dialog.addSpacer("small").addQuickExit().endDialog("vending", "", "Close");
    }

    const itemName = getItem(v.itemId)?.name ?? "item";
    const inBackpack = player.inventory.getAmount(v.itemId);

    dialog
      .addLabelWithIcon(`\`oStock: \`w${v.count}x ${itemName}\`\``, v.itemId, "small")
      .addTextBox(`\`oPrice: ${this.priceText()}`)
      .addTextBox(`\`oEarnings: \`w${v.earned} World Locks\`\``)
      .addSpacer("small");

    if (v.price < 0 && -v.price > v.count) {
      dialog.addSmallText("`4(You need to add more items or people can't purchase at this price!)``");
    }
    if (inBackpack > 0) dialog.addButton("addstock", `\`oAdd ${inBackpack} more from backpack\`\``);
    dialog.addButton("change_price", "`oChange price``");
    if (v.earned > 0) dialog.addButton("withdraw", "`2Collect earnings``");
    dialog.addButton("pullstock", "`4Take everything out``");

    return dialog.addSpacer("small").addQuickExit().endDialog("vending", "", "Close");
  }

  /**
   * Price dialog opened from the owner view: amount plus the pricing mode.
   */
  public priceDialog(): DialogBuilder {
    const v = this.vending;
    const machineName = getItem(this.data.fg)?.name ?? "Vending Machine";
    return this.baseDialog()
      .addTextBox(`Set the price of \`2${getItem(v.itemId)?.name ?? "the item"}\`\`:`)
      .addInputBox("setprice", "Price", Math.abs(v.price), 5)
      .addCheckbox("chk_peritem", "World Locks per Item", v.price >= 0 ? "selected" : "not_selected")
      .addCheckbox("chk_perlock", "Items per World Lock", v.price < 0 ? "selected" : "not_selected")
      .addSmallText(`\`5(${machineName} will not function when price is set to 0)\`\``)
      .addSpacer("small")
      .endDialog("vending", "Cancel", "Set price");
  }

  /**
   * Buyer view: what is sold, for how much, and how many the buyer wants.
   */
  private buyerDialog(player: Player): DialogBuilder {
    const v = this.vending;
    const dialog = this.baseDialog();

    if (v.itemId === 0 || v.count <= 0 || v.price === 0) {
      return dialog.addTextBox("`oThis vending machine is empty.``").addQuickExit().endDialog("vending", "", "Close");
    }

    const itemName = getItem(v.itemId)?.name ?? "item";
    const locks = countWorldLocks(player);
    dialog
      .addTextBox("`oThis machine is selling:")
      .addLabelWithIcon(`\`w${itemName}\`\``, v.itemId, "big")
      .addTextBox(`\`oPrice: ${this.priceText()}`)
      .addTextBox(`\`oIn stock: \`w${v.count}\`\``)
      .addTextBox(`\`oYou have: \`w${locks} World Locks\`\``)
      .addSpacer("small");

    if (v.price < 0 && -v.price > v.count) {
      return dialog.addTextBox("`4You'll need to wait for the owner to stock up to at least 1 World Lock's worth before you can buy.``").addQuickExit().endDialog("vending", "", "Close");
    }
    if (locks < (v.price > 0 ? v.price : 1)) {
      return dialog.addTextBox("`4You don't have enough World Locks!``").addQuickExit().endDialog("vending", "", "Close");
    }

    return dialog
      .addInputBox("buycount", "How many would you like to buy?", v.price > 0 ? 1 : -v.price, 3)
      .embed("expectprice", v.price)
      .embed("expectitem", v.itemId)
      .addQuickExit()
      .endDialog("vending", "Cancel", "Buy");
  }
}
