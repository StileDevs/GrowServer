import type { ItemDefinition } from "grow-items";
import { TANK_PACKET_TYPE } from "../../../constants";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import { GameUpdatePacket } from "../../packets/game-packet";
import type { Player } from "../../player";
import { Tile } from "../tile";
import type { Dice } from "../types";
import { LockPermission, TileExtraTypes, TileFlags } from "../constants";

/** Minimum time between two rolls of the same dice block. */
const ROLL_COOLDOWN_MS = 3000;
/** Faces of the dice; the serialized symbol is the face minus one (0..5). */
const DICE_FACES = 6;
/** Damage one fist punch deals, in the client's units (mirrors `Tile`). */
const PUNCH_DAMAGE = 6;

/**
 * Dice blocks. Extra data: u8 extra type, u8 symbol (face - 1).
 *
 * Punching rolls the dice at most once every 3 seconds. The roll travels in
 * the TILE_APPLY_DAMAGE packet: the client reads the face from the fourth
 * header byte (`buildRange`), which is where the legacy server wrote it.
 * Anyone may roll a public dice block; only players with break access damage it.
 */
export class DiceTile extends Tile {
  public extraType = TileExtraTypes.DICE;

  private get dice(): Dice {
    if (!this.data.dice) this.data.dice = { symbol: 0, lastRollTime: 0 };
    return this.data.dice;
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.dice = { symbol: 0, lastRollTime: 0 };
    return true;
  }

  public override async onPunch(player: Player): Promise<boolean> {
    const permitted = await this.world.hasTilePermission(player, this.data, LockPermission.BREAK);

    if (!permitted) {
      await this.onPunchFail(player);
      if (!(this.data.flags & TileFlags.PUBLIC)) return false;
    }

    const rolled = this.roll();

    if (permitted) {
      // normal damage flow; `applyDamage` carries the (new) symbol in the packet
      return super.onPunch(player);
    }

    // public dice used by a visitor: announce the roll without damaging the block
    if (rolled) this.broadcastRoll(player, 0);
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.dice;
  }

  /** Same as the base damage packet, with the dice symbol in the `buildRange` byte. */
  public override applyDamage(player: Player, damage: number): void {
    if (player.currentWorld !== this.world.name) return;

    if (!this.data.resetStateAt || this.data.resetStateAt <= Date.now()) {
      this.data.damage = 0;
    }
    if (damage !== 0) {
      this.data.damage = (this.data.damage ?? 0) + damage / PUNCH_DAMAGE;
    }
    this.data.resetStateAt = Date.now() + (this.item?.resetStateAfter ?? 4) * 1000;

    this.broadcastRoll(player, damage);
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!(await super.onWrench(player))) {
      await this.onPlaceFail(player);
      return false;
    }

    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;

    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id ?? 0, "big")
      .addCheckbox("checkbox_public", "Usable by public", this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected")
      .addCheckbox("checkbox_silence", "Silenced", this.data.flags & TileFlags.SILENCED ? "selected" : "not_selected")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .endDialog("dice_edit", "Cancel", "OK")
      .str();

    player.variants.sendOnDialogRequest(dialog);
    return true;
  }

  public override serializedFlags(flags: number): number {
    return flags | TileFlags.TILEEXTRA;
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(this.extraType);
    buffer.writeU8(this.dice.symbol);
  }

  /**
   * Rolls a new symbol when the cooldown has passed.
   * @returns true when the symbol changed.
   */
  private roll(): boolean {
    const dice = this.dice;
    const now = Date.now();
    if (now - dice.lastRollTime <= ROLL_COOLDOWN_MS) return false;

    dice.symbol = Math.floor(Math.random() * DICE_FACES);
    dice.lastRollTime = now;
    return true;
  }

  /** Sends a TILE_APPLY_DAMAGE packet carrying the current symbol to the world. */
  private broadcastRoll(player: Player, damage: number): void {
    this.world.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.TILE_APPLY_DAMAGE,
        netID: player.netID,
        buildRange: this.dice.symbol,
        itemID: damage,
        tileX: this.data.x,
        tileY: this.data.y,
      }).parse()!,
    );
  }
}

registerDialog("dice_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target?.block.dice) return;
  const { world, block } = target;

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) return;

  if (action.get("checkbox_public") === "1") block.flags |= TileFlags.PUBLIC;
  else block.flags &= ~TileFlags.PUBLIC;

  if (action.get("checkbox_silence") === "1") block.flags |= TileFlags.SILENCED;
  else block.flags &= ~TileFlags.SILENCED;

  new DiceTile(world, block).tileUpdate();
  world.markDirty();
});
