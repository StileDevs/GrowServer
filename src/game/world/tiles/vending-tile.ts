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

    this.sendDialog(player);
    return true;
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

  private addOffer(dialog: DialogBuilder, itemName: string): void {
    const v = this.vending;
    dialog
      .addSpacer("small")
      .addTextBox("For a cost of:")
      .addLabelWithIcon(`${v.price < 0 ? 1 : v.price} x \`8World Lock\`\``, ITEM_ID.WORLD_LOCK, "small")
      .addSpacer("small")
      .addTextBox("You will get:")
      .addLabelWithIcon(`${v.price < 0 ? -v.price : 1} x \`2${itemName}\`\``, v.itemId, "small")
      .addSpacer("small");
  }

  private ownerDialog(player: Player): DialogBuilder {
    const v = this.vending;
    const machineName = getItem(this.data.fg)?.name ?? "Vending Machine";
    const dialog = this.baseDialog();

    if (v.itemId === 0) {
      return dialog
        .addTextBox("This machine is empty.")
        .addItemPicker("stockitem", "`wPut an item in``", "Choose an item to put in the machine!")
        .addSpacer("small")
        .endDialog("vending", "Close", "");
    }

    const itemName = getItem(v.itemId)?.name ?? "item";
    const inBackpack = player.inventory.getAmount(v.itemId);

    dialog.addLabelWithIcon(`The machine contains a total of ${v.count} \`2${itemName}\`\`.`, v.itemId, "small");

    if (v.price === 0) {
      dialog.addSpacer("small").addTextBox("Not currently for sale!");
    } else {
      this.addOffer(dialog, itemName);
    }

    if (inBackpack > 0) {
      dialog.addSmallText(`You have ${inBackpack} ${itemName} in your backpack.`).addButton("addstock", "Add them to the machine");
    }
    dialog.addButton("pullstock", "Empty the machine");

    if (v.price < 0 && -v.price > v.count) {
      dialog.addSmallText("`4(You need to add more items or people can't purchase at this price!)``");
    }
    dialog
      .addSmallText(`\`5(${machineName} will not function when price is set to 0)\`\``)
      .addInputBox("setprice", "Price", Math.abs(v.price), 5)
      .addCheckbox("chk_peritem", "World Locks per Item", v.price >= 0 ? "selected" : "not_selected")
      .addCheckbox("chk_perlock", "Items per World Lock", v.price < 0 ? "selected" : "not_selected");

    if (v.earned > 0) {
      dialog.addSmallText(`You have earned ${v.earned} World Locks.`).addButton("withdraw", "Withdraw World Locks");
    }

    return dialog.addSpacer("small").endDialog("vending", "Close", "Update");
  }

  private buyerDialog(player: Player): DialogBuilder {
    const v = this.vending;
    const dialog = this.baseDialog();

    if (v.itemId === 0 || v.price === 0) {
      return dialog.addTextBox("This machine is out of order.").endDialog("vending", "Close", "");
    }

    const itemName = getItem(v.itemId)?.name ?? "item";
    dialog.addLabelWithIcon(`The machine contains a total of ${v.count} \`2${itemName}\`\`.`, v.itemId, "small");
    this.addOffer(dialog, itemName);

    if (v.price < 0 && -v.price > v.count) {
      return dialog
        .addTextBox("You'll need to wait for the owner to stock up to at least 1 World Lock's worth before you can buy.")
        .endDialog("vending", "Close", "");
    }

    return dialog
      .addTextBox(`You have ${countWorldLocks(player)} World Locks.`)
      .addInputBox("buycount", "How many would you like to buy?", 0, 3)
      .embed("expectprice", v.price)
      .embed("expectitem", v.itemId)
      .endDialog("vending", "Close", "Buy");
  }
}
