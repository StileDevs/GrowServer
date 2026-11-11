import type { ItemDefinition } from "grow-items";
import { TANK_PACKET_TYPE } from "../../../constants";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { getItem, seedIdOf } from "../../item/item-utils";
import { addRoleXp } from "../../quests/role-quests";
import { itemsWiki } from "../../item/item-wiki";
import { GameUpdatePacket } from "../../packets/game-packet";
import type { Player } from "../../player";
import { Tile } from "../tile";
import type { Tree } from "../types";
import { ActionTypes, LockPermission, TileExtraTypes, TileFlags } from "../constants";

/** Chance that a seed drops when a tree is harvested or broken before it is grown. */
const SEED_DROP_CHANCE = 0.1;
/** Largest fruit count the client can display on a tree. */
const MAX_VISIBLE_FRUITS = 4;
const U32_MAX = 0xffffffff;

/**
 * Seeds and the trees they grow into. Extra data: u8 extra type, u32 seconds
 * since planted, u8 visible fruit count.
 *
 * Planting a seed starts a tree, a second seed used on a growing tree splices
 * both into the tree of the block whose wiki splice recipe lists both seeds,
 * and punching a fully grown tree harvests it instead of damaging it.
 */
export class SeedTile extends Tile {
  public extraType = TileExtraTypes.SEED;

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.initializeTreeData(itemMeta, player);
    // the TILE_CHANGE_REQUEST sent by the base class carries no fruit count,
    // so send the full tile state afterwards
    this.tileUpdate();
    return true;
  }

  /**
   * Using another seed on a growing tree splices them.
   */
  public override async onItemPlace(player: Player, item: ItemDefinition): Promise<boolean> {
    if (!(await super.onItemPlace(player, item))) return false;

    const tree = this.data.tree;
    const splicerSeedId = item.id ?? 0;
    if (!tree || item.type !== ActionTypes.SEED || !player.inventory.hasItem(splicerSeedId)) return false;

    if (Date.now() >= tree.fullyGrownAt) {
      player.sendTextBubble("This tree is already too big to splice another seed with.");
      return false;
    }

    if (tree.isSpliced) {
      player.sendTextBubble("it would be too dangerous to try to mix three seeds.");
      return false;
    }

    const currentSeedMeta = getItem(this.data.fg);
    if (!currentSeedMeta) return false;

    const resultSeedMeta = splicerSeedId !== this.data.fg ? this.findSpliceResult(this.data.fg, splicerSeedId) : undefined;
    if (!resultSeedMeta) {
      player.sendTextBubble(`Hmm, it looks like \`w${currentSeedMeta.name}\`\` and \`w${item.name}\`\` can't be spliced.`);
      return false;
    }

    this.initializeTreeData(resultSeedMeta, player);
    this.data.tree!.isSpliced = true;
    this.tileUpdate();

    player.removeItemInven(splicerSeedId, 1);
    player.sendTextBubble(`${currentSeedMeta.name} and ${item.name} have been spliced to make an \`o${resultSeedMeta.name} Tree\`0!`);
    this.world.playPositioned("audio/success.wav", player.netID);
    return true;
  }

  /**
   * A fully grown tree is harvested; a growing one takes damage like any block.
   */
  public override async onPunch(player: Player): Promise<boolean> {
    const tree = this.data.tree;
    if (tree && Date.now() >= tree.fullyGrownAt && (await this.world.hasTilePermission(player, this.data, LockPermission.BREAK))) {
      const seedMeta = getItem(this.data.fg);
      if (!seedMeta) return false;

      this.dropHarvestGoodies(player, seedMeta, tree);

      this.world.broadcast(
        GameUpdatePacket.create({
          type: TANK_PACKET_TYPE.SEND_TILE_TREE_STATE,
          netID: player.netID,
          targetNetID: -1,
          tileX: this.data.x,
          tileY: this.data.y,
        }).parse()!,
      );

      this.data.fg = 0;
      this.data.damage = 0;
      this.data.resetStateAt = 0;
      // preserve LOCKED and WATER
      this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER);
      delete this.data.tree;

      const xp = this.harvestXp(seedMeta.rarity ?? 0, tree.fruitCount);
      player.addXp(xp);
      addRoleXp(player, "farmer", xp);
      return true;
    }

    return super.onPunch(player);
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    this.data.flags &= ~(TileFlags.TILEEXTRA | TileFlags.SEED);
    this.data.damage = 0;
    delete this.data.tree;
  }

  /**
   * A tree broken before it is grown only has a small chance to give its seed back.
   */
  public override onDrop(player: Player, destroyedItemId: number): void {
    if (Math.random() <= SEED_DROP_CHANCE) {
      this.world.drop(player, this.randomDropX(), this.randomDropY(), destroyedItemId, 1, { tree: true, origin: "block" });
    }
  }

  public override serialize(buffer: ExtendBuffer): void {
    const plantedAt = this.data.tree?.plantedAt ?? Date.now();
    const age = Math.floor((Date.now() - plantedAt) / 1000);
    const fruitCount = this.data.tree?.fruitCount ?? 0;

    buffer.writeU8(this.extraType);
    buffer.writeU32(Math.min(Math.max(age, 0), U32_MAX));
    buffer.writeU8(Math.min(fruitCount, MAX_VISIBLE_FRUITS));
  }

  /**
   * Finds the seed of the block whose splice recipe lists both seeds.
   */
  private findSpliceResult(seedA: number, seedB: number): ItemDefinition | undefined {
    const wanted = [seedIdOf(seedA), seedIdOf(seedB)];
    const result = itemsWiki.find((info) => {
      const splice = info.recipe?.splice;
      if (!splice || splice.length !== 2) return false;
      const ingredients = splice.map(seedIdOf);
      return wanted.every((id) => ingredients.includes(id));
    });
    if (!result) return undefined;

    const resultSeed = getItem(result.id + 1);
    return resultSeed?.type === ActionTypes.SEED ? resultSeed : undefined;
  }

  private dropHarvestGoodies(player: Player, seedMeta: ItemDefinition, tree: Tree): void {
    this.world.drop(player, this.randomDropX(), this.randomDropY(), tree.fruit, tree.fruitCount, { tree: true, origin: "harvest" });
    this.spawnGems(player, seedMeta.rarity ?? 0, "harvest");

    if (Math.random() <= SEED_DROP_CHANCE) {
      this.world.drop(player, this.randomDropX(), this.randomDropY(), this.data.fg, 1, { tree: true, origin: "harvest" });
      player.sendTextBubble(`A \`w${seedMeta.name}\`\` falls out!`);
    }
  }

  /**
   * Resets the tile to a freshly planted tree of the given seed. When a tree
   * is already growing (splicing) the original planting time is kept.
   */
  private initializeTreeData(seed: ItemDefinition, player?: Player): void {
    const now = Date.now();
    const rarity = seed.rarity ?? 0;
    const fruitCount = Math.floor(Math.random() * 10 * (1 - rarity / 1000)) + 1;
    const growSpeedMult = player?.playMods.has("apple_strudel") ? 0.95 : 1;
    const growTimeMs = Math.floor((seed.growTime ?? 0) * 1000 * growSpeedMult);

    this.data.flags |= TileFlags.TILEEXTRA | TileFlags.SEED;
    this.data.fg = seed.id ?? 0;
    this.data.damage = 0;

    this.data.tree = {
      fruit: (seed.id ?? 0) - 1,
      fruitCount,
      fullyGrownAt: (this.data.tree?.plantedAt ?? now) + growTimeMs,
      plantedAt: now,
      isSpliced: false,
    };
  }

  /** Experience for harvesting: one per fruit plus a rarity bonus. */
  private harvestXp(rarity: number, fruitCount: number): number {
    return fruitCount + Math.floor(rarity / 10);
  }

  private randomDropX(): number {
    return this.data.x * 32 + Math.floor(Math.random() * 16);
  }

  private randomDropY(): number {
    return this.data.y * 32 + Math.floor(Math.random() * 16);
  }
}
