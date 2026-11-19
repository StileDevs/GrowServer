import type { ItemDefinition } from "grow-items";
import { TANK_PACKET_TYPE } from "../../../constants";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { logger } from "../../../utils/logger";
import { GameUpdatePacket } from "../../packets/game-packet";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import type { TileData, DroppedItem, Sucker } from "../types";
import type { World } from "../world";
import { ActionTypes, LockPermission, TileExtraTypes, TileFlags } from "../constants";

/** Storage of the machines that use the MAGPLANT payload. */
const SUCKER_CAPACITY: Record<number, number> = {
  // MAGPLANT 5000
  5638: 5000,
  // Gaia's Beacon
  6946: 1500,
  // Unstable Tesseract
  6948: 1500,
};

/** Delay between two suction passes. */
const SWEEP_MS = 1000;

/** Storage of a machine that has no entry in `SUCKER_CAPACITY` yet. */
function capacityFor(itemId: number): number {
  return SUCKER_CAPACITY[itemId] ?? 5000;
}

/**
 * ITEM_SUCKER blocks (MAGPLANT 5000, Gaia's Beacon, Unstable Tesseract):
 * vacuum up drops produced by broken or harvested blocks into their own
 * storage, one item kind at a time.
 *
 * Extra data layout (matches the client's MAGPLANT payload):
 *   u8 extraType (62), u32 itemId, u32 amount, u8 sucking, u8 planting, u32 capacity
 */
export class ItemSuckerTile extends Tile {
  /** Storage of this machine, created on demand so old worlds still load. */
  private ensure(): Sucker {
    if (!this.data.sucker) {
      this.data.sucker = { itemId: 0, amount: 0, capacity: capacityFor(this.data.fg), sucking: true };
    }
    return this.data.sucker;
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;
    this.data.flags |= TileFlags.TILEEXTRA;
    this.ensure();
    ensureSweeper();
    this.tileUpdate();
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.sucker;
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!(await super.onWrench(player))) {
      await this.onPlaceFail(player);
      return false;
    }

    const stored = this.ensure();
    const held = stored.itemId ? (getItem(stored.itemId)?.name ?? `#${stored.itemId}`) : "nothing yet";

    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon(`\`w${getItem(this.data.fg)?.name ?? "Item Sucker"}\`\``, this.data.fg, "big")
      .addSpacer("small")
      .addTextBox(`Holding \`w${stored.amount}\`\`/\`w${stored.capacity}\`\` of \`w${held}\`\`.`)
      .addCheckbox("sucking", "Suck up broken blocks", stored.sucking ? "selected" : "not_selected")
      .addItemPicker("choose", "`wPick the item to collect``", "Set target")
      .addButton("withdraw", "`wWithdraw contents``")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .endDialog("itemsucker_edit", "Cancel", "Save");

    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }

  public override serializedFlags(flags: number): number {
    return this.data.sucker ? flags | TileFlags.TILEEXTRA : flags;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const stored = this.data.sucker;
    buffer.writeU8(TileExtraTypes.MAGPLANT);
    buffer.writeU32(stored?.itemId ?? 0);
    buffer.writeU32(stored?.amount ?? 0);
    buffer.writeU8(stored?.sucking ? 1 : 0);
    buffer.writeU8(0);
    buffer.writeU32(stored?.capacity ?? capacityFor(this.data.fg));
  }
}

registerDialog("itemsucker_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target?.block.sucker) return;
  const { world, block } = target;
  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) return;

  const stored = block.sucker!;
  stored.sucking = action.get("sucking") === "1";

  // the picker is inline, so a chosen item retunes the machine
  if (action.contains("choose")) {
    const itemId = action.getInt("choose", 0, 0);
    if (itemId > 0) {
      if (stored.amount > 0) {
        player.sendTextBubble("Withdraw the contents before changing the target.", false);
      } else if (getItem(itemId)) {
        stored.itemId = itemId;
        stored.capacity = capacityFor(block.fg);
      }
    }
  }

  if (action.get("buttonClicked") === "withdraw") withdraw(player, world, block, stored);

  new ItemSuckerTile(world, block).tileUpdate();
  world.markDirty();
});

function withdraw(player: Player, world: World, block: TileData, stored: Sucker): void {
  if (!stored.itemId || stored.amount <= 0) {
    player.sendTextBubble("It's empty.", false);
    return;
  }

  const added = player.addItemInven(stored.itemId, stored.amount);
  stored.amount -= added;
  if (added > 0) player.variants.sendOnConsoleMessage(`Collected \`w${added} ${getItem(stored.itemId)?.name ?? stored.itemId}\`\`.`);

  if (stored.amount > 0) {
    // backpack could not hold everything: spill the rest on the tile
    world.drop(player, block.x * 32 + 8, block.y * 32 + 8, stored.itemId, stored.amount, { tree: true });
    stored.amount = 0;
  }
}

let sweepTimer: ReturnType<typeof setInterval> | undefined;

/** Starts the shared suction loop on the first placed machine. */
function ensureSweeper(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    void sweep().catch((err) => logger.error({ err }, "item sucker sweep failed"));
  }, SWEEP_MS);
}

/** One suction pass over every loaded world; also used by the self-check. */
export async function sweep(): Promise<void> {
  // dynamic import: world-manager pulls in World, which pulls in the tile map
  const { worldManager } = await import("../world-manager");

  for (const world of worldManager.worlds.toArray()) {
    for (const block of world.data.blocks) {
      const stored = block.sucker;
      if (!stored?.sucking || !block.fg) continue;
      if (getItem(block.fg)?.type !== ActionTypes.ITEM_SUCKER) continue;
      sweepTile(world, block, stored);
    }
  }
}

/** Pulls the machine's target drops from the whole world into its storage. */
function sweepTile(world: World, block: TileData, stored: Sucker): void {
  if (!stored.itemId || stored.amount >= stored.capacity) return;

  const kept: DroppedItem[] = [];
  let changed = false;

  for (const item of world.data.dropped.items) {
    const matches = item.fromBreak && item.id === stored.itemId && stored.amount < stored.capacity;

    if (!matches) {
      kept.push(item);
      continue;
    }

    const take = Math.min(item.amount, stored.capacity - stored.amount);
    item.amount -= take;
    stored.amount += take;
    changed = true;

    if (item.amount <= 0) removeDrop(world, item);
    else {
      updateDropAmount(world, item);
      kept.push(item);
    }
  }

  if (!changed) return;
  world.data.dropped.items = kept;
  new ItemSuckerTile(world, block).tileUpdate();
  world.markDirty();
}

/** Tells the clients a drop shrank, reusing the merge echo of `World.drop`. */
function updateDropAmount(world: World, item: DroppedItem): void {
  const packet = GameUpdatePacket.create({
    type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
    netID: -3,
    targetNetID: item.uid,
    itemID: item.id,
    posX: item.x,
    posY: item.y,
  }).parse()!;
  packet.writeFloatLE(item.amount, 20);
  world.broadcast(packet);
}

/** Tells the clients a drop is gone. */
function removeDrop(world: World, item: DroppedItem): void {
  world.broadcast(
    GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
      netID: -1,
      targetNetID: -1,
      itemID: item.uid,
    }).parse()!,
  );
}
