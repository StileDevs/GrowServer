import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import { ActionTypes, BlockFlags, LockPermission, TileExtraTypes, TileFlags } from "../constants";

/** Screen Door: displaying it is a classic scam, the client refuses it too. */
const SCREEN_DOOR_ID = 858;
const NO_SPACE_MESSAGE = "You don't have enough space in your backpack! Free some and try again.";

/**
 * Display blocks. Extra data: u8 extra type, u32 displayed item id.
 *
 * The tile has to be inside a locked area; only the area owner can put an
 * item on display (by using it on the block) and take it back (by punching
 * the block or through the wrench dialog). An empty display block is punched
 * and broken like any other block.
 */
export class DisplayBlockTile extends Tile {
  public extraType = TileExtraTypes.DISPLAY_BLOCK;

  /** Id of the item on display, 0 when empty. */
  public get displayedItem(): number {
    return this.data.displayBlock?.displayedItem ?? 0;
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.displayBlock = { displayedItem: 0 };
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    const displayed = this.displayedItem;
    await super.onDestroy(player);
    delete this.data.displayBlock;

    // never lose the item that was on display
    if (displayed) {
      const itemMeta = getItem(displayed);
      player.addItemInven(displayed, 1);
      player.variants.sendOnConsoleMessage(`You picked up 1 ${itemMeta?.name ?? "item"}`);
      player.sendTextBubble(`You picked up 1 ${itemMeta?.name ?? "item"}`);
    }
  }

  public override async onPunch(player: Player): Promise<boolean> {
    const displayed = this.displayedItem;
    if (!displayed) return super.onPunch(player);

    // no break access: regular lock sound / public block handling
    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BREAK))) {
      return super.onPunch(player);
    }

    if (!this.isOwner(player)) {
      player.sendTextBubble("Only the block's owner can break it!");
      return false;
    }

    if (!player.inventory.canAddItem(displayed)) {
      player.sendTextBubble(NO_SPACE_MESSAGE);
      return false;
    }

    this.pickUp(player);
    return true;
  }

  public override async onPlaceBackground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    return this.tryDisplayItem(player, itemMeta);
  }

  public override async onItemPlace(player: Player, item: ItemDefinition): Promise<boolean> {
    return this.tryDisplayItem(player, item);
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!(await super.onWrench(player))) {
      await this.onPlaceFail(player);
      return false;
    }

    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon("`wDisplay Block``", this.data.fg, "big")
      .addSpacer("small")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y);

    const displayed = this.displayedItem;
    if (!displayed) {
      dialog.addTextBox("The Display Block is empty. Use an item on it to display the item!").endDialog("displayblock_edit", "Okay", "");
      player.variants.sendOnDialogRequest(dialog.str());
      return true;
    }

    dialog.addTextBox(`A ${getItem(displayed)?.name ?? "item"} is on display here.`);
    if (this.isOwner(player)) dialog.endDialog("displayblock_edit", "Leave it", "Pick it up");
    else dialog.endDialog("displayblock_edit", "Okay", "");

    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }

  public override serializedFlags(flags: number): number {
    return flags | TileFlags.TILEEXTRA;
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(this.extraType);
    buffer.writeU32(this.displayedItem);
  }

  /** Returns the displayed item to the player and empties the block. */
  public pickUp(player: Player): void {
    const displayed = this.displayedItem;
    if (!displayed) return;

    this.data.displayBlock = { displayedItem: 0 };
    player.addItemInven(displayed, 1);
    player.sendTextBubble(`You removed \`5${getItem(displayed)?.name ?? "item"}\`\` from the Display Block.`, false);
    this.tileUpdate();
  }

  /** Whether the player owns the area the block is in (developers always do). */
  public isOwner(player: Player): boolean {
    const ownerId = this.world.getTileOwnerPlayerId(this.data);
    return ownerId === undefined || ownerId === player.playerId || player.isDeveloper;
  }

  private async tryDisplayItem(player: Player, item: ItemDefinition): Promise<boolean> {
    const itemId = item.id ?? 0;
    const ownerId = this.world.getTileOwnerPlayerId(this.data);

    if (ownerId === undefined) {
      player.sendTextBubble("This area must be locked to put your item on display!", false);
      return false;
    }
    if (ownerId !== player.playerId) {
      player.sendTextBubble("Only the block's owner can place items in it.", false);
      return false;
    }
    if (this.displayedItem) {
      player.sendTextBubble("Remove what's in there first!", false);
      return false;
    }
    if (item.type === ActionTypes.LOCK || itemId === this.data.fg) {
      player.sendTextBubble("Sorry, no displaying Display Blocks or Locks", false);
      return false;
    }
    if (itemId === SCREEN_DOOR_ID) {
      player.sendTextBubble("Don't be a scammer.", false);
      return false;
    }
    if ((item.flags ?? 0) & BlockFlags.UNTRADEABLE) {
      player.sendTextBubble("You can't display untradeable items.", false);
      return false;
    }
    if (!player.inventory.hasItem(itemId)) return false;

    player.removeItemInven(itemId, 1);
    this.data.displayBlock = { displayedItem: itemId };
    this.world.playPositioned("audio/blorb.wav", player.netID);
    this.tileUpdate();
    return true;
  }
}

registerDialog("displayblock_edit", (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target?.block.displayBlock) return;
  const { world, block } = target;

  const tile = new DisplayBlockTile(world, block);
  const displayed = tile.displayedItem;
  if (!displayed || !tile.isOwner(player)) return;

  if (!player.inventory.canAddItem(displayed)) {
    player.sendTextBubble(NO_SPACE_MESSAGE);
    return;
  }

  tile.pickUp(player);
  world.markDirty();
});
