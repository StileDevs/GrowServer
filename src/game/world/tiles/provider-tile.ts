import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { ClothTypes } from "../../player/inventory";
import { addRoleXp } from "../../quests/role-quests";
import { ActionTypes, LockPermission, TileExtraTypes, TileFlags } from "../constants";
import { Tile } from "../tile";

/**
 * Providers: cows, chickens, science stations, ATMs, and other blocks that
 * yield items over time. Extra data layout: u8 extraType (9), u32 age (seconds).
 */
export class ProviderTile extends Tile {
  public override serializedFlags(flags: number): number {
    return flags | TileFlags.TILEEXTRA;
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(TileExtraTypes.PROVIDER ?? 9);
    const plantedAt = this.data.provider?.plantedAt ?? Date.now();
    const ageSeconds = Math.max(0, Math.floor((Date.now() - plantedAt) / 1000));
    buffer.writeU32(ageSeconds);
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;
    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.provider = { plantedAt: Date.now() };
    this.tileUpdate();
    return true;
  }

  public override async onPunch(player: Player): Promise<boolean> {
    if (this.data.fg === 0) return true;
    const itemMeta = this.item;
    if (!itemMeta) return false;

    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPunchFail(player);
      return false;
    }

    const growTime = itemMeta.growTime ?? 86400;
    const plantedAt = this.data.provider?.plantedAt ?? 0;
    const elapsedSeconds = Math.floor((Date.now() - plantedAt) / 1000);

    // If not ready yet, handle normal damage / punch
    if (elapsedSeconds < growTime) {
      return super.onPunch(player);
    }

    // Ready to harvest!
    this.harvest(player, itemMeta);
    return true;
  }

  /**
   * Harvests the ready provider and drops prizes according to GTOS rules.
   */
  private harvest(player: Player, itemMeta: ItemDefinition): void {
    const roleState = player.quests.role("provider");
    const providerLevel = roleState.lvl;

    // Role perks: Weed Magic double drop chance (1..5%)
    let multiplier = 1;
    const doubleChance = Math.min(5, Math.max(1, Math.floor(providerLevel / 2)));
    if (providerLevel >= 2 && Math.random() * 100 <= doubleChance) {
      multiplier = 2;
      player.variants.sendOnConsoleMessage("Weed Magic bonus doubled item");
    }

    // Rare milestone bonuses from GTOS
    if (providerLevel >= 4 && Math.random() * 100 <= 1) {
      player.addItemInven(5136, 1); // Smaraged Block
      player.variants.sendOnConsoleMessage("Obtained Smaraged Block");
    } else if (providerLevel >= 7 && Math.random() * 100 <= 1) {
      player.addItemInven(2410, 1); // Emerald Shard
      player.variants.sendOnConsoleMessage("Obtained Emerald Shard");
    } else if (providerLevel >= 10 && Math.floor(Math.random() * 300) === 0) {
      // Provider duplicates itself
      this.world.drop(player, this.dropX(), this.dropY(), this.data.fg, 1);
      player.variants.sendOnConsoleMessage(`The ${itemMeta.name} has dropped himself`);
    }

    // Drop logic matching GTOS tile.h lines 330-425
    const fg = this.data.fg;
    switch (fg) {
      case 872: // Chicken -> Egg (874)
        this.world.drop(player, this.dropX(), this.dropY(), 874, (Math.random() <= 0.25 ? 2 : 1) * multiplier);
        break;

      case 866: // Cow -> Milk (868)
      case 1044: // Buffalo -> Milk (868)
        this.world.drop(player, this.dropX(), this.dropY(), 868, (Math.random() <= 0.25 ? 2 : 1) * multiplier);
        break;

      case 3888: { // Sheep -> Wool (3890)
        const holdingShears = player.inventory.clothes.hand === 3914;
        const count = (holdingShears ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 2) + 1) * multiplier;
        this.world.drop(player, this.dropX(), this.dropY(), 3890, count);
        break;
      }

      case 2798: // Well -> Water Bucket (822)
        this.world.drop(player, this.dropX(), this.dropY(), 822, 1 * multiplier);
        break;

      case 1008: { // Science Station -> Chemicals (826, 828, 830, etc.)
        const chemList = [826, 828, 830, 832, 834, 836];
        const chem = chemList[Math.floor(Math.random() * chemList.length)] ?? 826;
        this.world.drop(player, this.dropX(), this.dropY(), chem, (Math.random() <= 0.2 ? 2 : 1) * multiplier);
        break;
      }

      case 1636: { // Coffee Maker
        const coffeeList = [728, 360, 308, 306, 2966, 1646, 3170, 1644, 1642, 3524, 1640, 1638, 2582];
        const coffeeItem = coffeeList[Math.floor(Math.random() * coffeeList.length)] ?? 1638;
        this.world.drop(player, this.dropX(), this.dropY(), coffeeItem, 1 * multiplier);
        break;
      }

      case 3044: { // Tackle Box -> Baits
        const baitList = [2914, 3012, 3014, 3016, 3018, 5528, 5526];
        const baitItem = baitList[Math.floor(Math.random() * baitList.length)] ?? 2914;
        this.world.drop(player, this.dropX(), this.dropY(), baitItem, (Math.random() <= 0.25 ? 2 : 1) * multiplier);
        break;
      }

      case 6212: { // Hospital Curtain -> Surgery tools
        const surgTools = [1258, 1260, 1262, 1264, 1266, 1268, 1270, 4308, 4310, 4312, 4314, 4316, 4318];
        const surgItem = surgTools[Math.floor(Math.random() * surgTools.length)] ?? 1258;
        this.world.drop(player, this.dropX(), this.dropY(), surgItem, 1 * multiplier);
        break;
      }

      case 5116: // Tea Set -> Tea (5114)
        this.world.drop(player, this.dropX(), this.dropY(), 5114, 1 * multiplier);
        break;

      case 1632: // Espresso Machine -> Coffee (1634)
        this.world.drop(player, this.dropX(), this.dropY(), 1634, 1 * multiplier);
        break;

      case 928: { // ATM -> Gems
        const gemList = [914, 916, 918, 920, 924];
        const gemItem = gemList[Math.floor(Math.random() * gemList.length)] ?? 914;
        this.world.drop(player, this.dropX(), this.dropY(), gemItem, 1 * multiplier);
        break;
      }

      default: {
        // Fallback: drops associated product (item.id - 1 or item.id)
        const dropId = itemMeta.id ? itemMeta.id - 1 : fg;
        this.world.drop(player, this.dropX(), this.dropY(), dropId > 0 ? dropId : fg, 1 * multiplier);
        break;
      }
    }

    // Role XP
    addRoleXp(player, "provider", 1);

    // Reset harvest timer
    this.data.provider = { plantedAt: Date.now() };
    this.tileUpdate();
    this.world.playPositioned("audio/getpoint.wav", player.netID);
  }

  private dropX(): number {
    return this.data.x * 32 + Math.floor(Math.random() * 16);
  }

  private dropY(): number {
    return this.data.y * 32 + Math.floor(Math.random() * 16);
  }
}
