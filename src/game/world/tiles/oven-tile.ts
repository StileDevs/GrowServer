import type { ItemDefinition } from "grow-items";
import { DialogBuilder } from "../../../utils/dialog-builder";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import {
  finishOvenCooking,
  getOvenElapsedLowMs,
  handleOvenItemPlace,
} from "../../cooking/cooking-manager";
import { OVEN_HEAT } from "../../cooking/cooking-constants";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { LockPermission, TileExtraTypes, TileFlags } from "../constants";
import { Tile } from "../tile";

/**
 * Timed Cooking Oven tile (ActionTypes.OVEN = 98):
 * Home Oven (4618), Commercial Oven (4498), Master Chef's Oven (4620),
 * Replicator (6412), and Taco Truck Oven (10820).
 *
 * Binary extra layout (TileExtraTypes.OVEN = 55):
 *   u8  extraType (55)
 *   u32 heatRate (0 = Off, 3 = Low, 6 = Med, 9 = High)
 *   u32 ingredientListSize (ingredients.length * 2)
 *   repeat (ingredients.length):
 *     u32 itemId
 *     u32 heatReceived (3 units per low-heat equivalent second)
 *   u32 timer (seconds since this snapshot)
 *   u64 started (Unix seconds)
 */
export class OvenTile extends Tile {
  public override serializedFlags(flags: number): number {
    return flags | TileFlags.TILEEXTRA;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const oven = this.data.oven;
    const tempLevel = oven?.tempLevel ?? OVEN_HEAT.OFF;
    const ingredients = oven?.ingredients ?? [];
    const elapsedLowMs = oven ? getOvenElapsedLowMs(oven) : 0;

    buffer.writeU8(TileExtraTypes.OVEN);
    // Tile::GetOvenString compares integer heat rates against 3 and 6.
    buffer.writeU32(tempLevel * 3);
    buffer.writeU32(ingredients.length * 2);

    for (const ing of ingredients) {
      buffer.writeU32(ing.itemId);
      buffer.writeU32(Math.floor(Math.max(0, elapsedLowMs - ing.timeAddedMs) * 3 / 1000));
    }

    buffer.writeU32(0);
    buffer.writeU32(oven ? Math.floor(oven.startedAt / 1000) : 0);
    buffer.writeU32(0);
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;
    this.data.flags |= TileFlags.TILEEXTRA;
    delete this.data.oven;
    this.world.markDirty();
    this.tileUpdate();
    return true;
  }

  public override async onWrench(player: Player): Promise<boolean> {
    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;

    const oven = this.data.oven;
    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon(`\`w${itemMeta.name}\`\``, this.data.fg, "big");

    if (oven && oven.tempLevel > OVEN_HEAT.OFF) {
      const heatLabel =
        oven.tempLevel === OVEN_HEAT.LOW
          ? "`2Low Heat``"
          : oven.tempLevel === OVEN_HEAT.MED
            ? "`9Medium Heat``"
            : "`4High Heat``";
      const elapsedSec = Math.floor(Math.max(0, Date.now() - oven.startedAt) / 1000);
      const ingNames = oven.ingredients.map((i) => getItem(i.itemId)?.name ?? `Item #${i.itemId}`).join(", ");
      dialog
        .addTextBox(`Status: Cooking on ${heatLabel} (${elapsedSec}s elapsed)`)
        .addTextBox(`Ingredients inside: \`w${ingNames || "None"}\`\``)
        .addTextBox(
          `Spices: \`w${oven.spices.salt}\`\` Salt, \`w${oven.spices.pepper}\`\` Pepper, \`w${oven.spices.sugar}\`\` Sugar`,
        )
        .addTextBox("Punch the oven when your dish is ready to take it out!");
    } else {
      dialog
        .addTextBox(
          "Use any cooking ingredient on this oven to preheat it and start cooking! Add more ingredients and spices (`wSalt``, `wPepper``, `wSugar``) at the right time, then punch the oven to take out your dish.",
        );
    }

    dialog.endDialog("oven_info", "OK", "");
    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }

  public override async onItemPlace(player: Player, item: ItemDefinition): Promise<boolean> {
    if (await handleOvenItemPlace(player, this.world, this.data, item.id ?? 0)) {
      return true;
    }
    return super.onItemPlace(player, item);
  }

  public override async onPunch(player: Player): Promise<boolean> {
    if (this.data.fg === 0) return true;

    const oven = this.data.oven;
    if (oven && oven.tempLevel > OVEN_HEAT.OFF) {
      if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
        await this.onPunchFail(player);
        return false;
      }
      finishOvenCooking(player, this.world, this.data);
      return true;
    }

    return super.onPunch(player);
  }

  public override async onDestroy(player: Player): Promise<void> {
    delete this.data.oven;
    await super.onDestroy(player);
  }
}
