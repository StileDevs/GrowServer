import type { ItemDefinition } from "grow-items";
import { DialogBuilder } from "../../../utils/dialog-builder";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { getItem } from "../../item/item-utils";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import type { Player } from "../../player";
import { ActionTypes, BlockFlags, ITEM_ID, TileExtraTypes, TileFlags } from "../constants";
import { Tile } from "../tile";
import type { World } from "../world";
import type { TileData } from "../types";
import { GameUpdatePacket } from "../../packets/game-packet";
import { TANK_PACKET_TYPE } from "../../../constants";

export const MAX_AUTO_ACTION_FUEL = 8000;
export const AUTO_ACTION_TICK_RATE_MS = 1000;

/** Checks whether a tile is an auto-action machine. */
export function isAutoActionBlock(itemId: number): boolean {
  return (
    itemId === ITEM_ID.GAIA_HEART ||
    itemId === ITEM_ID.TESSERACT_MANIPULATOR ||
    itemId === ITEM_ID.TECHNO_ORGANIC_ENGINE
  );
}

/** Determines if the player can manage this machine. */
export function canManageAutoAction(player: Player, world: World): boolean {
  return world.getOwnerPlayerId() !== undefined && (player.isDeveloper || world.getOwnerPlayerId() === player.playerId);
}

/**
 * Validates a chosen target item for an auto-action machine based on V8 & client logic.
 */
export function validateAutoActionTarget(machineFg: number, targetItemId: number): { ok: boolean; reason?: string } {
  const item = getItem(targetItemId);
  if (!item || targetItemId <= 0 || item.rarity === 999) {
    return { ok: false, reason: "Sorry that item is `4NOT`` allowed in this machine!" };
  }
  const type = item.type ?? ActionTypes.FOREGROUND;

  if (machineFg === ITEM_ID.TESSERACT_MANIPULATOR) {
    // Breaks blocks: cannot target clothes or mod items
    if (type === ActionTypes.CLOTHES || type === ActionTypes.ANCES || ((item.flags ?? 0) & BlockFlags.MOD)) {
      return { ok: false, reason: "`4NOPE!``" };
    }
  } else if (machineFg === ITEM_ID.GAIA_HEART) {
    // Harvests trees: must be a seed
    if (type !== ActionTypes.SEED) {
      return { ok: false, reason: "`4NOPE!``" };
    }
  } else if (machineFg === ITEM_ID.TECHNO_ORGANIC_ENGINE) {
    // Either break or seed
    if (type === ActionTypes.CLOTHES || type === ActionTypes.ANCES || ((item.flags ?? 0) & BlockFlags.MOD)) {
      return { ok: false, reason: "`4NOPE!``" };
    }
  }

  return { ok: true };
}

export class AutoActionTile extends Tile {
  public get machineTitle(): string {
    return getItem(this.data.fg)?.name ?? "Machine";
  }

  public get autoState() {
    return (this.data.autoAction ??= {
      gems: 0,
      targetItemId: 0,
      enabled: false,
    });
  }

  public override async onPlaceForeground(player: Player, item: ItemDefinition): Promise<boolean> {
    if (!canManageAutoAction(player, this.world)) {
      player.sendTextBubble(`Place a World Lock first. Only the world owner can install a ${this.machineTitle}.`, true);
      return false;
    }
    if (!(await super.onPlaceForeground(player, item))) return false;
    delete this.data.autoAction;
    void this.autoState;
    this.tileUpdate();
    this.world.markDirty();
    return true;
  }

  public override serializedFlags(flags: number): number {
    return flags | TileFlags.TILEEXTRA;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const s = this.autoState;
    const fg = this.data.fg;

    let extraType = TileExtraTypes.TESSERACT_MANIPULATOR;
    if (fg === ITEM_ID.GAIA_HEART) extraType = TileExtraTypes.GAIA_HEART;
    else if (fg === ITEM_ID.TECHNO_ORGANIC_ENGINE) extraType = TileExtraTypes.TECHNO_ORGANIC_ENGINE;

    buffer.writeU8(extraType);
    // gems_left (fuel amount)
    buffer.writeU32(s.gems);
    // next_update_ms / timer (0)
    buffer.writeU32(0);
    // item_id (target item)
    buffer.writeU32(s.targetItemId);
    // enabled (1 or 0)
    buffer.writeU32(s.enabled ? 1 : 0);

    // If Techno-Organic Engine (extra type 71), client expects additional 10 bytes:
    // u32 item, u32 amount, u8 collecting, u8 planting (matches sucker sub-layout)
    if (extraType === TileExtraTypes.TECHNO_ORGANIC_ENGINE) {
      buffer.writeU32(s.targetItemId);
      buffer.writeU32(0); // amount
      buffer.writeU8(s.enabled ? 1 : 0);
      buffer.writeU8(0);
    }
  }

  public override async onWrench(player: Player): Promise<boolean> {
    const s = this.autoState;
    const owner = canManageAutoAction(player, this.world);
    const title = this.machineTitle;
    const targetItem = s.targetItemId > 0 ? getItem(s.targetItemId) : undefined;
    const targetName = targetItem?.name ?? (s.targetItemId > 0 ? `Item ${s.targetItemId}` : "");

    const dialog = new DialogBuilder().defaultColor()
      .addLabelWithIcon(title, this.data.fg, "big")
      .addSpacer("small")
      .addSmallText("The device will consume 2300 Gems/hr while active!")
      .addSmallText(`Current Fuel = \`w${s.gems}/8,000\`\``);

    if (owner && s.gems < MAX_AUTO_ACTION_FUEL) {
      dialog
        .addSmallText("Refuel this with gems!")
        .addInputBox("refillfuel", "Add Gems:", "0", 5)
        .addButton("addfuel", "`wAdd Gems``");
    }

    dialog.addSpacer("small");
    if (s.targetItemId === 0) {
      dialog.addSmallText("No block type selected!");
    } else {
      dialog.addSmallText(`Target block is: \`2${targetName}\`\``);
    }

    if (owner) {
      dialog.addItemPicker("selecttarget", "`wChoose Target Item``", "Choose the target item!");
    }

    dialog
      .addSpacer("small")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .endDialog("autoactionblock", "Close", "OK")
      .addQuickExit();

    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }

  public override async onPunch(player: Player): Promise<boolean> {
    if (!canManageAutoAction(player, this.world)) {
      player.sendTextBubble("Only the world owner can activate this!", true);
      return false;
    }
    const s = this.autoState;
    // An idle punch toggles enabled state; if gems are stored warn before breaking
    if (!this.data.resetStateAt || this.data.resetStateAt <= Date.now()) {
      s.enabled = !s.enabled;
      player.sendTextBubble(`${this.machineTitle} is now ${s.enabled ? "`2ENABLED``" : "`4DISABLED``"}.`, true);
      this.data.resetStateAt = Date.now() + (this.item?.resetStateAfter ?? 4) * 1000;
      this.data.damage = 0;
      this.tileUpdate();
      this.world.markDirty();
      return true;
    }

    if (s.gems > 0) {
      player.sendTextBubble("`4Be careful``, if you return this to your backpack you will `4lose ALL`` Gems stored within! Use them up first!", true);
      player.variants.sendOnConsoleMessage("`4Be careful``, if you return this to your backpack you will `4lose ALL`` Gems stored within! Use them up first!");
      return false;
    }

    return super.onPunch(player);
  }

  public override async onDestroy(player: Player): Promise<void> {
    delete this.data.autoAction;
    await super.onDestroy(player);
  }
}

registerDialog("autoactionblock", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target || !isAutoActionBlock(target.block.fg)) return;
  const { world, block } = target;
  if (!canManageAutoAction(player, world)) return;

  const tile = new AutoActionTile(world, block);
  const s = tile.autoState;

  if (action.contains("refillfuel")) {
    const raw = action.get("refillfuel");
    if (/^\d+$/.test(raw)) {
      const requested = Number(raw);
      if (requested > 0) {
        const available = player.gems;
        const needed = Math.max(0, MAX_AUTO_ACTION_FUEL - s.gems);
        const added = Math.min(requested, available, needed);
        if (added > 0) {
          player.setGems(player.gems - added);
          s.gems += added;
        }
      }
    }
  }

  if (action.contains("selecttarget")) {
    const raw = action.get("selecttarget");
    if (/^\d+$/.test(raw)) {
      let targetId = Number(raw);
      if (block.fg === ITEM_ID.TESSERACT_MANIPULATOR) {
        // If user picked a seed for the manipulator, convert to block ID if applicable
        const item = getItem(targetId);
        if (item?.type === ActionTypes.SEED && targetId % 2 !== 0) {
          targetId--;
        }
      } else if (block.fg === ITEM_ID.GAIA_HEART) {
        // If user picked a block for Heart of Gaia, convert to seed ID if applicable
        const item = getItem(targetId);
        if (item?.type !== ActionTypes.SEED && targetId % 2 === 0) {
          targetId++;
        }
      }

      const validation = validateAutoActionTarget(block.fg, targetId);
      if (!validation.ok) {
        player.sendTextBubble(validation.reason ?? "`4NOPE!``", true);
        player.variants.sendOnConsoleMessage(validation.reason ?? "`4NOPE!``");
        return;
      }
      s.targetItemId = targetId;
    }
  }

  world.markDirty();
  tile.tileUpdate();
  await tile.onWrench(player);
});

/**
 * World tick routine for executing automated actions (harvest / break).
 */
export function tickAutoActionMachines(world: World): void {
  if (world.getOwnerPlayerId() === undefined) return;
  const now = Date.now();

  for (const block of world.data.blocks) {
    if (!isAutoActionBlock(block.fg)) continue;
    const s = block.autoAction;
    if (!s || !s.enabled || s.targetItemId <= 0 || s.gems <= 0) continue;

    if (s.lastWorkTime && now - s.lastWorkTime < AUTO_ACTION_TICK_RATE_MS) continue;
    s.lastWorkTime = now;

    if (block.fg === ITEM_ID.GAIA_HEART) {
      // Auto harvest mature trees matching targetItemId
      executeGaiaHarvest(world, block, s);
    } else if (block.fg === ITEM_ID.TESSERACT_MANIPULATOR) {
      // Auto break blocks matching targetItemId
      executeTesseractBreak(world, block, s);
    } else if (block.fg === ITEM_ID.TECHNO_ORGANIC_ENGINE) {
      // Combination: if seed, harvest; otherwise break
      const item = getItem(s.targetItemId);
      if (item?.type === ActionTypes.SEED) executeGaiaHarvest(world, block, s);
      else executeTesseractBreak(world, block, s);
    }
  }
}

function executeGaiaHarvest(world: World, machineBlock: TileData, state: NonNullable<TileData["autoAction"]>): void {
  for (const block of world.data.blocks) {
    if (block.fg !== state.targetItemId || !block.tree) continue;
    if (Date.now() < block.tree.fullyGrownAt) continue;

    const seedMeta = getItem(block.fg);
    if (!seedMeta) continue;

    // Deduct 1 gem fuel
    state.gems--;
    if (state.gems <= 0) state.enabled = false;

    // Visual effect: packet type 17 / particle from machine or tree
    world.broadcast(GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.ITEM_EFFECT,
      buildRange: 6,
      netID: -1,
      tileX: block.fg,
      posX: machineBlock.x * 32 + 16,
      posY: machineBlock.y * 32 + 16,
      speedX: block.x * 32 + 16,
      speedY: block.y * 32 + 16,
    }).parse()!);

    // Harvest tree
    const tree = block.tree;
    const dropX = block.x * 32 + Math.floor(Math.random() * 16);
    const dropY = block.y * 32 + Math.floor(Math.random() * 16);

    world.drop(undefined as any, dropX, dropY, tree.fruit, tree.fruitCount, { tree: true, origin: "harvest" });
    if (Math.random() <= 0.3) {
      world.drop(undefined as any, dropX, dropY, block.fg, 1, { tree: true, origin: "harvest" });
    }

    world.broadcast(GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.SEND_TILE_TREE_STATE,
      netID: -1,
      targetNetID: -1,
      tileX: block.x,
      tileY: block.y,
    }).parse()!);

    block.fg = 0;
    block.damage = 0;
    block.resetStateAt = 0;
    block.flags = block.flags & (TileFlags.LOCKED | TileFlags.WATER);
    delete block.tree;

    world.markDirty();
    new AutoActionTile(world, machineBlock).tileUpdate();
    return;
  }
}

function executeTesseractBreak(world: World, machineBlock: TileData, state: NonNullable<TileData["autoAction"]>): void {
  for (const block of world.data.blocks) {
    const isFg = block.fg === state.targetItemId;
    const isBg = !isFg && block.bg === state.targetItemId;
    if (!isFg && !isBg) continue;

    // Deduct 1 gem fuel
    state.gems--;
    if (state.gems <= 0) state.enabled = false;

    // Visual effect
    world.broadcast(GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.ITEM_EFFECT,
      buildRange: 6,
      netID: -1,
      tileX: state.targetItemId,
      posX: machineBlock.x * 32 + 16,
      posY: machineBlock.y * 32 + 16,
      speedX: block.x * 32 + 16,
      speedY: block.y * 32 + 16,
    }).parse()!);

    const itemMeta = getItem(state.targetItemId);
    const maxDamage = itemMeta?.breakHits ?? 4;
    block.damage = (block.damage ?? 0) + 1;

    if (block.damage >= maxDamage) {
      // Block broken: drop without gems
      const dropX = block.x * 32 + Math.floor(Math.random() * 16);
      const dropY = block.y * 32 + Math.floor(Math.random() * 16);
      const rand = Math.random();

      if (rand <= 0.11) {
        world.drop(undefined as any, dropX, dropY, state.targetItemId, 1, { tree: true, origin: "block" });
      } else if (rand <= 0.33) {
        const seedId = state.targetItemId % 2 === 0 ? state.targetItemId + 1 : state.targetItemId;
        if (!((itemMeta?.flags ?? 0) & BlockFlags.SEEDLESS)) {
          world.drop(undefined as any, dropX, dropY, seedId, 1, { tree: true, origin: "block" });
        }
      }
      // Note: No gems dropped from auto-action breaking!

      if (isFg) block.fg = 0;
      else block.bg = 0;
      block.damage = 0;
      block.resetStateAt = 0;
      block.flags = block.flags & (TileFlags.LOCKED | TileFlags.WATER);

      world.broadcast(GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.TILE_CHANGE_REQUEST,
        netID: -1,
        buildRange: ITEM_ID.FIST,
        itemID: ITEM_ID.FIST,
        tileX: block.x,
        tileY: block.y,
      }).parse()!);
    } else {
      // Visual damage hit
      world.broadcast(GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.TILE_APPLY_DAMAGE,
        netID: -1,
        tileX: block.x,
        tileY: block.y,
      }).parse()!);
    }

    world.markDirty();
    new AutoActionTile(world, machineBlock).tileUpdate();
    return;
  }
}
