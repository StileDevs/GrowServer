import { DialogBuilder } from "../../../utils/dialog-builder";
import { logger } from "../../../utils/logger";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import { LockPermission, TileFlags } from "../constants";

/**
 * Switcheroo-type blocks (switches, toggleable platforms, ...). No extra data:
 * the on/off state is the tile's OPEN flag.
 *
 * Players with break access toggle the block with a normal punch (which also
 * damages it). When the block is marked public, visitors toggle it without
 * damaging it; otherwise they only hear the lock sound.
 */
export class SwitcheROO extends Tile {
  public override async onPunch(player: Player): Promise<boolean> {
    if (await this.world.hasTilePermission(player, this.data, LockPermission.BREAK)) {
      const punched = await super.onPunch(player);
      // the block broke or the punch was refused: nothing to toggle
      if (!punched || this.data.fg === 0) return punched;

      this.toggle(player);
      return true;
    }

    if (this.data.flags & TileFlags.PUBLIC) {
      // visible punch without damage, then the authoritative state
      this.applyDamage(player, 0);
      this.toggle(player);
      return true;
    }

    await this.onPunchFail(player);
    return false;
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!(await super.onWrench(player))) {
      await this.onPlaceFail(player);
      return false;
    }

    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;

    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id ?? 0, "big")
      .addCheckbox("checkbox_public", "Usable by public", this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .endDialog("switcheroo_edit", "Cancel", "OK")
      .str();

    player.variants.sendOnDialogRequest(dialog);
    return true;
  }

  /** Flips the OPEN flag and sends the new state to everyone in the world. */
  protected toggle(player: Player): void {
    this.data.flags ^= TileFlags.OPEN;
    this.tileUpdate();
    this.world.markDirty();
    logger.debug({ world: this.world.name, x: this.data.x, y: this.data.y, item: this.data.fg, on: (this.data.flags & TileFlags.OPEN) !== 0, by: player.tankIDName }, "block toggled");
    this.onToggled(player);
  }

  /** Hook for blocks that do more than flip their flag (antigravity, jammers). */
  protected onToggled(_player: Player): void {}
}

registerDialog("switcheroo_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) return;

  if (action.get("checkbox_public") === "1") block.flags |= TileFlags.PUBLIC;
  else block.flags &= ~TileFlags.PUBLIC;

  new SwitcheROO(world, block).tileUpdate();
  world.markDirty();
});
