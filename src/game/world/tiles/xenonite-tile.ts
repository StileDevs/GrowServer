import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import { ActionTypes, LockPermission, TileExtraTypes, TileFlags } from "../constants";
import type { XenoniteSettings } from "../types";

/** Powers a Xenonite Crystal can take away, in the order the client reads them. */
export const XENONITE_POWERS: readonly string[] = [
  "Double Jump",
  "High Jump",
  "Heat Resist",
  "Strong Punch",
  "Long Punch",
  "Speedy",
  "Long Build",
  "Speedy in Water",
  "Punch Damage",
];

/** Powerups a Xenonite Crystal can block. */
export const XENONITE_POWERUPS: readonly string[] = ["Bubble Gum", "Coffee", "Das Red Balloon", "Janeway's Coffee", "Snowball"];

/**
 * Xenonite Crystal. Extra data: u8 type, u8 blocked powerup mask, u32 power
 * mask. The client applies the listed restrictions to everyone in the world,
 * so the server only stores and broadcasts the masks.
 *
 * Only one crystal may exist in a world.
 */
export class XenoniteTile extends Tile {
  public extraType = TileExtraTypes.XENONITE;

  public get settings(): XenoniteSettings {
    if (!this.data.xenonite) this.data.xenonite = { mods: 0, powerups: 0 };
    return this.data.xenonite;
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    const another = this.world.data.blocks.some((block) => block !== this.data && getItem(block.fg)?.type === ActionTypes.XENONITE);
    if (another) {
      player.sendTextBubble("Only one `wXenonite Crystal`` is allowed per world!", false);
      player.sendPlayPositioned("audio/cant_place_tile.wav");
      return false;
    }

    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.xenonite = { mods: 0, powerups: 0 };
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.xenonite;
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!(await super.onWrench(player))) {
      await this.onPlaceFail(player);
      return false;
    }

    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;

    const settings = this.settings;
    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id ?? 0, "big")
      .addSmallText("Take away these powers from everyone in the world:")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y);

    XENONITE_POWERS.forEach((name, index) => {
      dialog.addCheckbox(`xenonite_p_${index}`, name, settings.mods & (1 << index) ? "selected" : "not_selected");
    });

    dialog.addSpacer("small").addSmallText("Block these powerups:");
    XENONITE_POWERUPS.forEach((name, index) => {
      dialog.addCheckbox(`xenonite_u_${index}`, name, settings.powerups & (1 << index) ? "selected" : "not_selected");
    });

    dialog.endDialog("xenonite_edit", "Cancel", "OK");
    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const settings = this.settings;
    buffer.writeU8(this.extraType);
    buffer.writeU8(settings.powerups & 0xff);
    buffer.writeU32(settings.mods);
  }
}

registerDialog("xenonite_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  if (getItem(block.fg)?.type !== ActionTypes.XENONITE) return;
  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) return;

  let mods = 0;
  XENONITE_POWERS.forEach((_name, index) => {
    if (action.get(`xenonite_p_${index}`) === "1") mods |= 1 << index;
  });

  let powerups = 0;
  XENONITE_POWERUPS.forEach((_name, index) => {
    if (action.get(`xenonite_u_${index}`) === "1") powerups |= 1 << index;
  });

  block.xenonite = { mods, powerups };
  new XenoniteTile(world, block).tileUpdate();

  for (const other of world.players) {
    other.variants.sendOnConsoleMessage("`5Xenonite has changed everyone's powers!``");
  }
  world.markDirty();
});
