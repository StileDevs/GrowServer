import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import {
  ActionTypes,
  LockPermission,
  TileExtraTypes,
  TileFlags,
  XENO_B_DOUBLE_JUMP,
  XENO_B_HEAT_RESIST,
  XENO_B_LONG_BUILD,
  XENO_B_LONG_PUNCH,
  XENO_B_POWERUPS,
  XENO_B_SPEED,
  XENO_B_STRONG_PUNCH,
  XENO_B_HIGH_JUMP,
  XENO_F_DOUBLE_JUMP,
  XENO_F_HEAT_RESIST,
  XENO_F_LONG_BUILD,
  XENO_F_LONG_PUNCH,
  XENO_F_SPEED,
  XENO_F_STRONG_PUNCH,
  XENO_F_HIGH_JUMP,
} from "../constants";
import type { XenoniteSettings } from "../types";

/** One power the crystal can force or block, with its dialog checkbox names. */
interface XenonitePower {
  name: string;
  forceName: string;
  blockName: string;
  forceBit: number;
  blockBit: number;
  /** The bit lives in the u32 `flags2` word instead of the u8 `flags` word. */
  second: boolean;
}

/** The powers the official crystal dialog offers, in dialog order. */
const XENONITE_POWERS: readonly XenonitePower[] = [
  { name: "Double Jump", forceName: "checkbox_force_dbl", blockName: "checkbox_block_dbl", forceBit: XENO_F_DOUBLE_JUMP, blockBit: XENO_B_DOUBLE_JUMP, second: false },
  { name: "High Jump", forceName: "checkbox_force_hig", blockName: "checkbox_block_hig", forceBit: XENO_F_HIGH_JUMP, blockBit: XENO_B_HIGH_JUMP, second: false },
  { name: "Heat Resist", forceName: "checkbox_force_asb", blockName: "checkbox_block_asb", forceBit: XENO_F_HEAT_RESIST, blockBit: XENO_B_HEAT_RESIST, second: true },
  { name: "Strong Punch", forceName: "checkbox_force_pun", blockName: "checkbox_block_pun", forceBit: XENO_F_STRONG_PUNCH, blockBit: XENO_B_STRONG_PUNCH, second: false },
  { name: "Long Punch", forceName: "checkbox_force_lng", blockName: "checkbox_block_lng", forceBit: XENO_F_LONG_PUNCH, blockBit: XENO_B_LONG_PUNCH, second: true },
  { name: "Speedy", forceName: "checkbox_force_spd", blockName: "checkbox_block_spd", forceBit: XENO_F_SPEED, blockBit: XENO_B_SPEED, second: false },
  { name: "Long Build", forceName: "checkbox_force_lngb", blockName: "checkbox_block_lngb", forceBit: XENO_F_LONG_BUILD, blockBit: XENO_B_LONG_BUILD, second: true },
];

/**
 * Upgrades a world file saved with the old single power mask to the official
 * force/block flag words. Old bits meant "take away", which maps to block bits.
 */
export function upgradeXenonite(raw: XenoniteSettings & { mods?: number; powerups?: number }): XenoniteSettings {
  if (typeof raw.flags === "number" && typeof raw.flags2 === "number") return raw;

  const mods = raw.mods ?? 0;
  let flags = 0;
  let flags2 = 0;
  if (mods & (1 << 0)) flags |= XENO_B_DOUBLE_JUMP;
  if (mods & (1 << 1)) flags |= XENO_B_HIGH_JUMP;
  if (mods & (1 << 2)) flags2 |= XENO_B_HEAT_RESIST;
  if (mods & (1 << 3)) flags |= XENO_B_STRONG_PUNCH;
  if (mods & (1 << 4)) flags2 |= XENO_B_LONG_PUNCH;
  if (mods & (1 << 5)) flags |= XENO_B_SPEED;
  if (mods & (1 << 6)) flags2 |= XENO_B_LONG_BUILD;
  if (raw.powerups) flags2 |= XENO_B_POWERUPS;
  return { flags, flags2 };
}

/**
 * Xenonite Crystal. Extra data: u8 type, u8 flags, u32 flags2 — the layout the
 * client parses. `flags` holds the force/block bits of Double Jump, High Jump,
 * Strong Punch and Speedy, `flags2` those of Heat Resist, Long Punch, Long Build
 * and the powerup block. The client applies the restrictions to everyone in the
 * world; the server enforces them through the stats and shows the crystal as an
 * active play mod. Only one crystal may exist in a world.
 */
export class XenoniteTile extends Tile {
  public extraType = TileExtraTypes.XENONITE;

  public get settings(): XenoniteSettings {
    if (!this.data.xenonite) {
      this.data.xenonite = { flags: 0, flags2: 0 };
      return this.data.xenonite;
    }
    this.data.xenonite = upgradeXenonite(this.data.xenonite as XenoniteSettings & { mods?: number; powerups?: number });
    return this.data.xenonite as XenoniteSettings;
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
    this.data.xenonite = { flags: 0, flags2: 0 };
    this.world.invalidateXenonite();
    for (const other of this.world.players) other.playMods.add("xenonite");
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.xenonite;
    this.world.invalidateXenonite();
    for (const other of this.world.players) other.playMods.remove("xenonite");
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
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y);

    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      // read-only summary, like the official server shows to non-builders
      dialog.addTextBox("This crystal can either grant or block super powers for all players in your world!");
      for (const power of XENONITE_POWERS) {
        const forced = (power.second ? settings.flags2 : settings.flags) & power.forceBit;
        const blocked = (power.second ? settings.flags2 : settings.flags) & power.blockBit;
        if (forced) dialog.addTextBox(`\`2${power.name} power is given to all players.\`\``);
        else if (blocked) dialog.addTextBox(`\`6${power.name} power is blocked for all players.\`\``);
        else dialog.addTextBox(`${power.name} power can be used if equipped.`);
      }
      if (settings.flags2 & XENO_B_POWERUPS) dialog.addTextBox("`6Temporary powerups like Balloons and Coffee are not usable.\`\`");
      dialog.endDialog("xenonite_edit", "", "OK");
    } else {
      dialog
        .addTextBox(
          "This crystal can either grant or block super powers for all players in your world! Any power that's unchecked will work as normal - people will have the power if they equip an item with it.",
        )
        .addSpacer("small");
      for (const power of XENONITE_POWERS) {
        const word = power.second ? settings.flags2 : settings.flags;
        dialog
          .addCheckbox(power.forceName, `Force ${power.name}`, word & power.forceBit ? "selected" : "not_selected")
          .addCheckbox(power.blockName, `Block ${power.name}`, word & power.blockBit ? "selected" : "not_selected")
          .addSpacer("small");
      }
      dialog.addCheckbox("checkbox_block_pwr", "Block Use of Powerups", settings.flags2 & XENO_B_POWERUPS ? "selected" : "not_selected").addSpacer("small");
      dialog.endDialog("xenonite_edit", "Update", "Cancel");
    }

    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const settings = this.settings;
    buffer.writeU8(this.extraType);
    buffer.writeU8(settings.flags & 0xff);
    buffer.writeU32(settings.flags2);
  }
}

registerDialog("xenonite_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  if (getItem(block.fg)?.type !== ActionTypes.XENONITE) return;
  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) {
    player.sendTextBubble("No hacking the crystal!", false);
    return;
  }

  let flags = 0;
  let flags2 = 0;
  for (const power of XENONITE_POWERS) {
    const forced = action.get(power.forceName) === "1";
    const blocked = action.get(power.blockName) === "1";
    if (power.second) {
      if (forced) flags2 |= power.forceBit;
      if (blocked) flags2 |= power.blockBit;
    } else {
      if (forced) flags |= power.forceBit;
      if (blocked) flags |= power.blockBit;
    }
  }
  if (action.get("checkbox_block_pwr") === "1") flags2 |= XENO_B_POWERUPS;

  block.xenonite = { flags, flags2 };
  new XenoniteTile(world, block).tileUpdate();

  // the masks change every player's stats, not just the client's own state
  world.invalidateXenonite();
  for (const other of world.players) {
    if (!other.playMods.has("xenonite")) other.playMods.add("xenonite");
    else other.playMods.refresh();
    other.variants.sendOnConsoleMessage("`5The Xenonite Crystal has shifted...``");
  }
  world.markDirty();
});
