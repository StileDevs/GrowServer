import { Collection } from "../../../utils/collection";
import { consumeDroppedAmount } from "../../cooking/cooking-manager";
import { EXPLICIT_COMBINE_RECIPES, EZ_COOK_OVEN } from "../../cooking/cooking-constants";
import { getItem } from "../../item/item-utils";
import { itemsWiki } from "../../item/item-wiki";
import type { Player } from "../../player";
import { addRoleXp } from "../../quests/role-quests";
import { LockPermission } from "../constants";
import { Tile } from "../tile";
import type { DroppedItem } from "../types";

interface MatchedCombineRecipe {
  resultId: number;
  resultAmount: number;
  ingredients: ReadonlyArray<{ id: number; amount: number }>;
}

/**
 * Finds a 3-ingredient combine recipe matching the 3 distinct item IDs on the tile.
 * Checks explicit recipes (such as E-Z Cook Oven recipes) first, then falls back
 * to `.cache/wiki.json` (`recipe.combine`).
 */
function findCombineRecipeByIds(ingredientIds: readonly number[]): MatchedCombineRecipe | undefined {
  if (ingredientIds.length !== 3) return undefined;

  for (const explicit of EXPLICIT_COMBINE_RECIPES) {
    if (
      explicit.items.length === 3 &&
      explicit.items.every((req) => ingredientIds.includes(req.id))
    ) {
      return {
        resultId: explicit.resultId,
        resultAmount: explicit.resultAmount,
        ingredients: explicit.items,
      };
    }
  }

  for (const info of itemsWiki.values()) {
    const combine = info.recipe?.combine;
    if (!combine || combine.items.length !== 3) continue;
    // Ignore wiki scrape artifacts where the output item lists itself as an input
    if (combine.items.some((i) => i.id === info.id)) continue;

    if (combine.items.every((req) => ingredientIds.includes(req.id))) {
      return {
        resultId: info.id,
        resultAmount: combine.resultAmount || 1,
        ingredients: combine.items,
      };
    }
  }

  return undefined;
}

/**
 * Tile handler for `ActionTypes.LAB` (39):
 * E-Z Cook Oven (952), Laboratory (932), Microwave (1472), Barbecue Grill (1664),
 * Witch's Cauldron (1772), Sacred Well (2262), Elven Loom (2878), etc.
 *
 * Dropping 3 ingredients on the tile and punching it combines them into the
 * resulting item. When no dropped items are on the tile, punching damages and
 * breaks the block normally.
 */
export class ChemicalCombinerTile extends Tile {
  public override async onPunch(player: Player): Promise<boolean> {
    if (this.data.fg === 0) return super.onPunch(player);

    const dropsOnTile = this.world.data.dropped.items.filter(
      (d) => d.block.x === this.data.x && d.block.y === this.data.y && d.amount > 0,
    );

    // When no items are sitting on the tile, allow normal block damage/breaking
    if (dropsOnTile.length === 0) {
      return super.onPunch(player);
    }

    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPunchFail(player);
      return false;
    }

    // Group dropped stacks on this tile by item ID
    const grouped = new Collection<number, { total: number; stacks: DroppedItem[] }>();
    for (const drop of dropsOnTile) {
      const existing = grouped.get(drop.id);
      if (existing) {
        existing.total += drop.amount;
        existing.stacks.push(drop);
      } else {
        grouped.set(drop.id, { total: drop.amount, stacks: [drop] });
      }
    }

    if (grouped.size < 3) {
      player.sendTextBubble("I need 3 ingredients!", true);
      return true;
    }

    if (grouped.size > 3) {
      player.sendTextBubble("It won't mix more than 3 items at once!", true);
      return true;
    }

    const ingredientIds = [...grouped.keys()];
    const recipe = findCombineRecipeByIds(ingredientIds);
    if (!recipe) {
      player.sendTextBubble("That doesn't seem to make anything!", true);
      return true;
    }

    // Verify each ingredient has enough dropped items
    for (const req of recipe.ingredients) {
      const entry = grouped.get(req.id);
      if (!entry || entry.total < req.amount) {
        const reqSummary = recipe.ingredients
          .map((i) => `${i.amount} ${getItem(i.id)?.name ?? `Item #${i.id}`}`)
          .join(", ");
        player.sendTextBubble(`You need \`w${reqSummary}\`\` to make that!`, true);
        return true;
      }
    }

    // Consume required amounts from the dropped stacks on the tile
    for (const req of recipe.ingredients) {
      const entry = grouped.get(req.id)!;
      let toConsume = req.amount;
      for (const stack of entry.stacks) {
        if (toConsume <= 0) break;
        const take = Math.min(stack.amount, toConsume);
        consumeDroppedAmount(this.world, stack, take);
        toConsume -= take;
      }
    }

    // Spawn the combined output on the tile
    this.world.drop(
      player,
      this.data.x * 32 + 8,
      this.data.y * 32 + 8,
      recipe.resultId,
      recipe.resultAmount,
      { tree: true },
    );

    const resultName = getItem(recipe.resultId)?.name ?? `Item #${recipe.resultId}`;
    const isEzOven = this.data.fg === EZ_COOK_OVEN;

    this.world.sendParticleEffect(44, this.data.x * 32 + 16, this.data.y * 32 + 16);
    this.world.playPositioned("audio/terraform.wav", player.netID);
    player.sendTextBubble(
      isEzOven
        ? `Order up! You baked \`2${recipe.resultAmount} ${resultName}\`\`!`
        : `\`2SCIENCE!\`\` You combined them into \`2${recipe.resultAmount} ${resultName}\`\`!`,
      true,
    );

    player.addXp(15);
    if (isEzOven) {
      addRoleXp(player, "cook", 5);
    }

    return true;
  }
}
