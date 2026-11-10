import type { ItemDefinition } from "grow-items";
import { DialogBuilder } from "../../../utils/dialog-builder";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { getItem } from "../../item/item-utils";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import type { Player } from "../../player";
import { MAX_ITEM_STACK } from "../../player/inventory";
import { ActionTypes, BlockFlags, ITEM_ID, TileExtraTypes, TileFlags } from "../constants";
import { bindMagplantRemote, canManageMagplant, canUseMagplantRemote, getSuckerCapacity, invalidateMagplantRemotes, isMagplantPlantable, isSuckerBlock } from "../magplant";
import { Tile } from "../tile";

/** MAGPLANT, Gaia's Beacon, and Unstable Tesseract sucker implementation. */
export class MagplantTile extends Tile {
  /** Maximum capacity based on the specific sucker machine item ID. */
  public get capacity(): number {
    return getSuckerCapacity(this.data.fg);
  }

  /** Display title for the machine in dialogs. */
  public get machineTitle(): string {
    return getItem(this.data.fg)?.name ?? "Machine";
  }

  /** Initializes legacy machines and defaults missing reference mode flags. */
  public get storage() {
    const state = this.data.magplant ??= { instanceId: crypto.randomUUID(), itemId: 0, count: 0 };
    state.collecting ??= true;
    state.planting ??= false;
    return state;
  }

  public override async onPlaceForeground(player: Player, item: ItemDefinition): Promise<boolean> {
    if (!canManageMagplant(player, this.world)) {
      player.sendTextBubble(`Place a World Lock first. Only the world owner can install a ${this.machineTitle}.`, true);
      return false;
    }
    if (!(await super.onPlaceForeground(player, item))) return false;
    delete this.data.magplant;
    void this.storage;
    this.tileUpdate();
    this.world.markDirty();
    return true;
  }

  public override serializedFlags(flags: number): number { return flags | TileFlags.TILEEXTRA; }

  public override serialize(buffer: ExtendBuffer): void {
    const s = this.storage;
    buffer.writeU8(TileExtraTypes.MAGPLANT);
    buffer.writeU32(s.itemId);
    buffer.writeU32(s.count);
    buffer.writeU8(s.collecting ? 1 : 0);
    buffer.writeU8(s.planting ? 1 : 0);
    // V8 form_visual writes capacity at extra offset 12, after a reserved byte.
    buffer.writeU8(0);
    buffer.writeU16(this.capacity);
    buffer.writeU8(0);
  }

  public override async onWrench(player: Player): Promise<boolean> {
    const s = this.storage;
    const owner = canManageMagplant(player, this.world);
    const title = this.machineTitle;
    const dialog = new DialogBuilder().defaultColor().addLabelWithIcon(title, this.data.fg, "big")
      .embed("tilex", this.data.x).embed("tiley", this.data.y).addSpacer("small");
    if (!s.itemId) {
      dialog.addTextBox("The machine is empty.");
      if (owner) dialog.addItemPicker("selectitem", "Choose Item", `Choose an item to put in the ${title}!`);
    } else {
      const name = getItem(s.itemId)?.name ?? `Item ${s.itemId}`;
      dialog.addLabelWithIcon(name, s.itemId, "small");
      if (owner) {
        dialog.addTextBox(s.count ? `The machine contains ${s.count} ${name}` : "The machine is currently empty!");
        const carried = player.inventory.getAmount(s.itemId);
        if (s.count >= this.capacity) dialog.addTextBox("The machine is at maximum capacity!");
        else if (carried > 0 && s.itemId !== ITEM_ID.GEMS) dialog.addButton("additem", "Add Items to the machine");
        if (s.count > 0) {
          if (carried >= MAX_ITEM_STACK && s.itemId !== ITEM_ID.GEMS) dialog.addTextBox(`You are already carrying ${MAX_ITEM_STACK} ${name}!`);
          else dialog.addButton("retrieveitem", "Retrieve Item");
        } else dialog.addButton("clearitem", "Change Item");
      }
      dialog.addTextBox(`Building mode: ${s.planting ? "ACTIVE" : "DISABLED"}`);
      if (owner || s.planting) dialog.addTextBox(`Use the MAGPLANT 5000 Remote to build ${name} directly from the ${title}'s storage.`);
      if (canUseMagplantRemote(player, this.world, this.data)) dialog.addButton("getplantationdevice", "Get Remote");
      if (owner) dialog.addCheckbox("chk_enablesucking", "Enable Collection.", s.collecting ? "selected" : "not_selected");
    }
    dialog.endDialog("itemsucker_block", "Close", owner && s.itemId ? "Update" : "");
    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }

  /** An idle punch toggles building; continued punches can break an empty machine. */
  public override async onPunch(player: Player): Promise<boolean> {
    if (!canManageMagplant(player, this.world)) {
      player.sendTextBubble("Only the world owner can activate this!", true);
      return false;
    }
    const s = this.storage;
    if (s.itemId && (!this.data.resetStateAt || this.data.resetStateAt <= Date.now())) {
      if (!isMagplantPlantable(s.itemId)) {
        player.sendTextBubble(`Cannot activate the ${this.machineTitle}, the current item cannot be placed.`, true);
      } else {
        s.planting = !s.planting;
        if (s.planting) bindMagplantRemote(player, this.world, this.data);
        else invalidateMagplantRemotes(this.data);
        player.sendTextBubble(`Building mode: ${s.planting ? "ACTIVE" : "DISABLED"}`, true);
      }
      this.data.resetStateAt = Date.now() + (this.item?.resetStateAfter ?? 4) * 1000;
      this.data.damage = 0;
      this.tileUpdate();
      this.world.markDirty();
      return true;
    }
    if (s.count > 0) { player.sendTextBubble(`Empty the ${this.machineTitle} before breaking it!`, true); return false; }
    return super.onPunch(player);
  }

  public override async onDestroy(player: Player): Promise<void> {
    if (this.storage.count > 0) return;
    invalidateMagplantRemotes(this.data);
    await super.onDestroy(player);
    delete this.data.magplant;
  }
}

registerDialog("itemsucker_block", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target || !isSuckerBlock(target.block.fg)) return;
  const { world, block } = target;
  const tile = new MagplantTile(world, block);
  const s = tile.storage;
  const button = action.get("buttonClicked");
  if (button === "getplantationdevice") { bindMagplantRemote(player, world, block); return; }
  if (!canManageMagplant(player, world)) return;
  if (action.contains("selectitem")) {
    const raw = action.get("selectitem");
    if (!/^\d+$/.test(raw)) return;
    const id = Number(raw);
    const item = getItem(id);
    if (s.count > 0 || !item || id <= 0 || id === ITEM_ID.FIST || id === ITEM_ID.WRENCH || id === ITEM_ID.GEMS
      || id === ITEM_ID.MAGPLANT_REMOTE || item.rarity === 999 || ((item.flags ?? 0) & BlockFlags.UNTRADEABLE)
      || !player.inventory.hasItem(id)) return;

    // Gaia's Beacon stores seeds only; Unstable Tesseract stores non-seeds only
    if (block.fg === ITEM_ID.GAIA_BEACON && item.type !== ActionTypes.SEED) {
      player.sendTextBubble("You can only store seeds in this machine.", true);
      player.variants.sendOnConsoleMessage("You can only store seeds in this machine.");
      return;
    }
    if (block.fg === ITEM_ID.UNSTABLE_TESSERACT && item.type === ActionTypes.SEED) {
      player.sendTextBubble("You cannot store seeds in this machine.", true);
      player.variants.sendOnConsoleMessage("You cannot store seeds in this machine.");
      return;
    }

    invalidateMagplantRemotes(block);
    s.itemId = id;
    s.collecting = true;
    s.planting = false;
  } else if (button === "additem" || button === "retrieveitem") {
    const adding = button === "additem";
    if (!s.itemId || (adding && s.itemId === ITEM_ID.GEMS)) return;
    // Preserve currency stored by the earlier GTOS implementation without exposing gem mode.
    if (!adding && s.itemId === ITEM_ID.GEMS) {
      player.addGems(s.count);
      s.count = 0;
    } else {
      const carried = player.inventory.getAmount(s.itemId);
      const capacity = tile.capacity;
      const amount = adding ? Math.min(carried, capacity - s.count) : Math.min(s.count, MAX_ITEM_STACK - carried);
      if (amount <= 0) return;
      const dialog = new DialogBuilder().defaultColor().embed("tilex", block.x).embed("tiley", block.y)
        .embed("storageitem", s.itemId).embed("machine", s.instanceId)
        .addLabelWithIcon(getItem(s.itemId)?.name ?? `Item ${s.itemId}`, s.itemId, "small")
        .addTextBox(`How many would you like to ${adding ? "add" : "remove"}?`)
        .addInputBox(adding ? "itemtoadd" : "itemtoremove", "Amount:", String(amount), 5)
        .endDialog(adding ? "itemaddedtosucker" : "itemremovedfromsucker", "Close", adding ? "Add" : "Retrieve");
      player.variants.sendOnDialogRequest(dialog.str());
      return;
    }
  } else if (button === "clearitem") {
    if (s.count > 0) return;
    invalidateMagplantRemotes(block);
    s.itemId = 0;
    s.collecting = true;
    s.planting = false;
  } else if ((button === "Update" || button === "update" || button === "") && action.contains("chk_enablesucking")) {
    const value = action.get("chk_enablesucking");
    if (value !== "0" && value !== "1") return;
    s.collecting = value === "1";
  } else return;
  world.markDirty();
  tile.tileUpdate();
  await tile.onWrench(player);
});

for (const adding of [true, false]) registerDialog(adding ? "itemaddedtosucker" : "itemremovedfromsucker", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target || !isSuckerBlock(target.block.fg) || !canManageMagplant(player, target.world)) return;
  if (action.get("buttonClicked") === "Close" || action.get("buttonClicked") === "Cancel") return;
  const tile = new MagplantTile(target.world, target.block);
  const s = tile.storage;
  if (!s.itemId || s.itemId === ITEM_ID.GEMS || action.get("storageitem") !== String(s.itemId) || action.get("machine") !== s.instanceId) return;
  const raw = action.get(adding ? "itemtoadd" : "itemtoremove");
  if (!/^\d+$/.test(raw)) return;
  const requested = Number(raw);
  if (!Number.isSafeInteger(requested) || requested <= 0) return;
  if (adding) {
    const amount = Math.min(requested, tile.capacity - s.count, player.inventory.getAmount(s.itemId));
    if (amount > 0) s.count += player.removeItemInven(s.itemId, amount);
  } else {
    const amount = Math.min(requested, s.count, MAX_ITEM_STACK);
    if (amount > 0) s.count -= player.addItemInven(s.itemId, amount);
  }
  target.world.markDirty();
  tile.tileUpdate();
  await tile.onWrench(player);
});
