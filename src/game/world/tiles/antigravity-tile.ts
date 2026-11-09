import type { ItemDefinition } from "grow-items";
import type { Player } from "../../player";
import type { World } from "../world";
import { ITEM_ID, TileFlags } from "../constants";
import { SwitcheROO } from "./switcheroo-tile";

/** The world's Antigravity Generator, if one is placed. */
export function findAntigravityGenerator(world: World) {
  return world.data.blocks.find((tile) => tile.fg === ITEM_ID.ANTIGRAVITY_GENERATOR);
}

/** Whether the world's Antigravity Generator is switched on. */
export function isAntigravityActive(world: World): boolean {
  const generator = findAntigravityGenerator(world);
  return generator !== undefined && (generator.flags & TileFlags.OPEN) !== 0;
}

/**
 * Antigravity Generator: a toggleable block (punch to switch), one per
 * world. The client lowers the gravity itself while the generator is on,
 * so the server only keeps the on/off flag and tells the world.
 */
export class AntigravityTile extends SwitcheROO {
  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (findAntigravityGenerator(this.world)) {
      player.sendTextBubble(`This world already has a ${itemMeta.name} somewhere on it, installing two would be dangerous!`, true);
      return false;
    }
    return super.onPlaceForeground(player, itemMeta);
  }

  protected override onToggled(player: Player): void {
    const enabled = (this.data.flags & TileFlags.OPEN) !== 0;
    const message = enabled ? "`3Antigravity was enabled.``" : "`4Antigravity was disabled.``";
    for (const other of this.world.players) other.variants.sendOnConsoleMessage(message);
    this.world.playPositioned(enabled ? "audio/dialog_confirm.wav" : "audio/dialog_cancel.wav", player.netID);
  }
}
