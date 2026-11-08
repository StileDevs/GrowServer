import { DialogBuilder } from "../../../utils/dialog-builder";
import { logger } from "../../../utils/logger";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import { ITEM_ID, LockPermission, TileFlags } from "../constants";

/**
 * Switcheroo-type blocks (switches, toggleable platforms, ...). No extra data:
 * the on/off state is the tile's OPEN flag.
 *
 * Players with break access toggle the block with a normal punch (which also
 * damages it). When the block is marked public, visitors toggle it without
 * damaging it; otherwise they only hear the lock sound.
 */
export class SwitcheROO extends Tile {
  /** Whether the block starts toggled on when it is placed. */
  protected startsOn = true;

  /**
   * Toggleable blocks (Music Amplifier, Boombox, switches) are placed in the
   * ON state, like the official server: the client then applies the block's
   * effect right away instead of waiting for the first punch.
   */
  public override async onPlaceForeground(player: Player, itemMeta: Parameters<Tile["onPlaceForeground"]>[1]): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;
    if (this.startsOn) {
      this.data.flags |= TileFlags.OPEN;
      this.tileUpdate();
    }
    return true;
  }

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
      .addCheckbox("checkbox_silence", "Silenced", this.data.flags & TileFlags.SILENCED ? "selected" : "not_selected")
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

/**
 * Music blocks that play a tune while toggled on (Mystic Record Player, Organ
 * Piano, Vintage Jukebox). They start silent and play after a punch, and the
 * Music Amplifier next to them needs that ON state to extend their sound to
 * the whole world.
 */
export class MusicBlockTile extends SwitcheROO {
  protected startsOn = false;

  /**
   * A music block that starts playing refreshes the state of the amplifiers
   * next to it, so the client re-evaluates whether the tune is amplified.
   */
  protected override onToggled(player: Player): void {
    const playing = (this.data.flags & TileFlags.OPEN) !== 0;
    const amplifiers = [-1, 1]
      .map((dx) => this.world.getTileAt(this.data.x + dx, this.data.y))
      .filter((tile) => tile !== undefined && getItem(tile.fg)?.id === ITEM_ID.MUSIC_AMPLIFIER);

    logger.info(
      {
        world: this.world.name,
        x: this.data.x,
        y: this.data.y,
        item: this.data.fg,
        playing,
        by: player.tankIDName,
        amplifiers: amplifiers.map((tile) => `${tile!.x},${tile!.y}:${(tile!.flags & TileFlags.OPEN) !== 0 ? "on" : "off"}`),
      },
      "music block toggled",
    );

    if (!playing) return;
    for (const tile of amplifiers) new SwitcheROO(this.world, tile!).tileUpdate();
  }
}

registerDialog("switcheroo_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) return;

  if (action.get("checkbox_public") === "1") block.flags |= TileFlags.PUBLIC;
  else block.flags &= ~TileFlags.PUBLIC;
  // silenced blocks keep working but the client mutes their sound
  if (action.get("checkbox_silence") === "1") block.flags |= TileFlags.SILENCED;
  else block.flags &= ~TileFlags.SILENCED;

  new SwitcheROO(world, block).tileUpdate();
  world.markDirty();
});
