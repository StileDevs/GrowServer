import { TANK_PACKET_TYPE } from "../../constants";
import { DialogBuilder } from "../../utils/dialog-builder";
import { getItem } from "../item/item-utils";
import { FISH_BASE_IDS } from "../fishing/fishing-manager";
import { registerDialog } from "../network/dialog-handler";
import { GameUpdatePacket } from "../packets/game-packet";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { MAX_ITEM_STACK } from "../player/inventory";
import { addRoleXp } from "../quests/role-quests";
import { LockPermission } from "../world/constants";
import { tileFrom } from "../world/tiles";
import type { DroppedItem, OvenData, OvenIngredient, TileData } from "../world/types";
import type { World } from "../world/world";
import {
  BEEF,
  BLAND_MUSH,
  BUTCHER_KNIFE,
  CHICKEN_MEAT,
  CUTTING_BOARD,
  DISGUSTING_MESS,
  EXQUISITE_ROLLING_PIN,
  FISH_CHUNK,
  FOOD_GRINDER,
  GRINDABLE_ITEMS,
  MAC_N_CHEESE_STAR,
  MASTER_CHEFS_OVEN,
  OVEN_COOKABLE_INGREDIENTS,
  OVEN_HEAT,
  OVEN_ITEM_IDS,
  OVEN_RECIPES,
  OVEN_SPICES,
  PEPPER,
  PLETHORA_MAC_N_CHEESE_STARS,
  REPLICATOR,
  SALSA,
  SALT,
  SUGAR,
  SUSHI_KNIFE,
  type OvenRecipe,
} from "./cooking-constants";

/** Maximum number of main ingredients that can be placed into an oven at once. */
const MAX_OVEN_INGREDIENTS = 6;
/** Low-heat equivalent seconds after which an unattended oven burns out on its own. */
const OVEN_BURNOUT_LOW_SEC = 180;
/** Chance (20%) for the Replicator (6412) to produce a duplicate dish. */
const REPLICATOR_DUPLICATE_CHANCE = 0.2;

/** Returns the display name of an item ID. */
function itemName(id: number): string {
  return getItem(id)?.name ?? `Item #${id}`;
}

/**
 * Grants an item stack to a player, dropping any overflow on the floor at their feet.
 */
function giveOrDropItem(player: Player, world: World, itemId: number, amount: number): void {
  const added = player.addItemInven(itemId, amount);
  const leftover = amount - added;
  if (leftover > 0) {
    world.drop(player, player.state.x, player.state.y, itemId, leftover);
  }
}

/** Removes or decrements a dropped item stack in the world. */
export function consumeDroppedAmount(world: World, drop: DroppedItem, amount: number): void {
  const remaining = drop.amount - amount;
  if (remaining <= 0) {
    const idx = world.data.dropped.items.indexOf(drop);
    if (idx !== -1) world.data.dropped.items.splice(idx, 1);

    const removePacket = GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
      netID: -2,
      targetNetID: -1,
      itemID: drop.uid,
    }).parse()!;
    world.broadcast(removePacket);
  } else {
    drop.amount = remaining;
    const updatePacket = GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
      netID: -3,
      targetNetID: drop.uid,
      itemID: drop.id,
      posX: drop.x,
      posY: drop.y,
    }).parse()!;
    updatePacket.writeFloatLE(remaining, 20);
    world.broadcast(updatePacket);
  }
  world.markDirty();
}

// =============================================================================
// 1. Food Grinder (4582)
// =============================================================================

/**
 * Shows the Food Grinder information dialog when wrenched.
 */
export function handleFoodGrinderWrench(player: Player, block: TileData): boolean {
  if (block.fg !== FOOD_GRINDER) return false;

  const dialog = new DialogBuilder()
    .defaultColor("`o")
    .addLabelWithIcon("`wFood Grinder``", FOOD_GRINDER, "big")
    .addTextBox("Use items on here to try to grind them up into tasty food. Only certain things can be ground up.")
    .addTextBox("You might be surprised what you can grind!")
    .endDialog("grinder_info", "Thanks for the info!", "")
    .str();

  player.variants.sendOnDialogRequest(dialog);
  return true;
}

/**
 * Handles using an item on a Food Grinder (4582) tile.
 * @returns true when the target tile is a Food Grinder.
 */
export function handleFoodGrinderUse(player: Player, block: TileData, itemId: number): boolean {
  if (block.fg !== FOOD_GRINDER) return false;

  const held = player.inventory.getAmount(itemId);
  if (held <= 0) return true;

  const recipe = GRINDABLE_ITEMS[itemId];
  if (!recipe) {
    player.sendTextBubble("`5[`2That's not grindable``]``", true);
    return true;
  }

  if (held < recipe.count) {
    player.sendTextBubble(`\`5[\`2I need ${recipe.count} of those to grind them!\`\`]\`\``, true);
    return true;
  }

  const maxGrinds = Math.floor(held / recipe.count);
  const name = itemName(itemId);
  const dialog = new DialogBuilder()
    .defaultColor("`o")
    .addLabelWithIcon(`\`wGrind ${name}\`\``, itemId, "big")
    .addTextBox(`You have ${held} ${name}. It takes ${recipe.count} per grind. How many times will you grind (max ${maxGrinds})?`)
    .addTextBox("`4Beware:`` If you don't have room in your inventory for the resulting items, they will drop on the floor.")
    .embed("itemID", itemId)
    .embed("tilex", block.x)
    .embed("tiley", block.y)
    .addInputBox("count", "", String(maxGrinds), 5)
    .endDialog("grinder", "Cancel", "OK")
    .str();

  player.variants.sendOnDialogRequest(dialog);
  return true;
}

registerDialog("grinder", (player, action) => {
  const world = player.world;
  if (!world) return;

  const itemId = action.getInt("itemID");
  const count = action.getInt("count");
  const tileX = action.getInt("tilex", -1);
  const tileY = action.getInt("tiley", -1);

  if (count <= 0) return;
  const recipe = GRINDABLE_ITEMS[itemId];
  if (!recipe) return;

  if (tileX >= 0 && tileY >= 0) {
    const block = world.getTileAt(tileX, tileY);
    if (!block || block.fg !== FOOD_GRINDER) return;
  }

  const required = count * recipe.count;
  const held = player.inventory.getAmount(itemId);
  if (held < required) {
    player.sendTextBubble(`You don't have enough ${itemName(itemId)}!`, true);
    return;
  }

  if (player.removeItemInven(itemId, required, true) <= 0) return;
  giveOrDropItem(player, world, recipe.prize, count);

  const inName = itemName(itemId);
  const outName = itemName(recipe.prize);
  world.sendItemEffect(recipe.prize, player, player);
  world.playPositioned("audio/ochorus.wav", player.netID);
  player.sendTextBubble(`You ground \`w${required} ${inName}\`\` into \`2${count} ${outName}\`\`!`, true);
  player.addXp(count * 5);
  addRoleXp(player, "cook", count);
});

// =============================================================================
// 2. Cutting Board (3470) + Butcher Knife (4506) / Sushi Knife (3466)
// =============================================================================

const FISH_ID_SET: ReadonlySet<number> = new Set(FISH_BASE_IDS);

/**
 * Slices raw fish, chicken, or cow dropped on a Cutting Board (3470) when punched
 * while holding a Butcher Knife (4506) or Sushi Knife (3466).
 * @returns true when a dropped item was sliced on the cutting board.
 */
export function handleCuttingBoardSlice(player: Player, world: World, block: TileData): boolean {
  if (block.fg !== CUTTING_BOARD) return false;

  const hand = player.inventory.clothes.hand;
  if (hand !== BUTCHER_KNIFE && hand !== SUSHI_KNIFE) return false;

  const dropsOnTile = world.data.dropped.items.filter(
    (d) => d.block.x === block.x && d.block.y === block.y && d.amount > 0,
  );
  if (dropsOnTile.length === 0) return false;

  for (const drop of dropsOnTile) {
    let resultId = 0;
    if (FISH_ID_SET.has(drop.id)) {
      resultId = FISH_CHUNK;
    } else if (drop.id === 872) {
      // Chicken -> Chicken Meat
      resultId = CHICKEN_MEAT;
    } else if (drop.id === 866) {
      // Cow -> Beef
      resultId = BEEF;
    }

    if (resultId > 0) {
      const sourceName = itemName(drop.id);
      const outName = itemName(resultId);
      consumeDroppedAmount(world, drop, 1);
      world.drop(player, block.x * 32 + 8, block.y * 32 + 8, resultId, 1);
      world.sendParticleEffect(45, block.x * 32 + 16, block.y * 32 + 16);
      world.playPositioned("audio/splat.wav", player.netID);
      player.sendTextBubble(`You sliced the \`w${sourceName}\`\` into \`21 ${outName}\`\`!`, true);
      player.addXp(5);
      addRoleXp(player, "cook", 1);
      return true;
    }
  }

  return false;
}

// =============================================================================
// 3. Mac n' Cheese Star (4612 <-> 4614) Double-Tap Conversion
// =============================================================================

/**
 * Converts 100 Mac n' Cheese Stars (4612) into 1 Plethora Of Mac n' Cheese Stars (4614)
 * or breaks 1 Plethora (4614) into 100 Stars (4612) when activated from the backpack.
 */
export async function handleCookingItemActivate(player: Player, itemId: number): Promise<boolean> {
  if (itemId === MAC_N_CHEESE_STAR) {
    if (player.inventory.getAmount(MAC_N_CHEESE_STAR) < 100) {
      player.sendTextBubble("You need 100 Mac n' Cheese Stars to combine them into a Plethora!", true);
      return true;
    }
    if (player.inventory.getAmount(PLETHORA_MAC_N_CHEESE_STARS) + 1 > MAX_ITEM_STACK) {
      player.sendTextBubble("Whoops, you're holding too many Plethora Of Mac n' Cheese Stars!", true);
      return true;
    }
    player.removeItemInven(MAC_N_CHEESE_STAR, 100);
    player.addItemInven(PLETHORA_MAC_N_CHEESE_STARS, 1);
    player.sendTextBubble("You combined 100 Mac n' Cheese Stars into a `2Plethora Of Mac n' Cheese Stars``!", true);
    await player.saveToDatabase();
    return true;
  }

  if (itemId === PLETHORA_MAC_N_CHEESE_STARS) {
    if (player.inventory.getAmount(PLETHORA_MAC_N_CHEESE_STARS) < 1) return true;
    if (player.inventory.getAmount(MAC_N_CHEESE_STAR) + 100 > MAX_ITEM_STACK) {
      player.sendTextBubble("Whoops, you're holding too many Mac n' Cheese Stars!", true);
      return true;
    }
    player.removeItemInven(PLETHORA_MAC_N_CHEESE_STARS, 1);
    player.addItemInven(MAC_N_CHEESE_STAR, 100);
    player.sendTextBubble("You broke down a Plethora into `2100 Mac n' Cheese Stars``!", true);
    await player.saveToDatabase();
    return true;
  }

  return false;
}

// =============================================================================
// 4. Timed Cooking Ovens (ActionTypes.OVEN = 98)
// =============================================================================

/** Whether a tile has a Cooking Oven foreground block. */
export function isOvenTile(block: TileData | undefined): boolean {
  if (!block) return false;
  return OVEN_ITEM_IDS.has(block.fg) || getItem(block.fg)?.type === 98;
}

/** Low-heat equivalent elapsed milliseconds for an active oven. */
export function getOvenElapsedLowMs(oven: OvenData, now = Date.now()): number {
  const mult = Math.max(1, oven.tempLevel);
  return Math.max(0, (now - oven.startedAt) * mult);
}

/** Opens the heat selection dialog when placing the first ingredient into an empty oven. */
export function openOvenHeatDialog(player: Player, block: TileData, itemId: number): void {
  const ovenName = itemName(block.fg);
  const ingName = itemName(itemId);

  const dialog = new DialogBuilder()
    .defaultColor("`o")
    .addLabelWithIcon(`\`w${ovenName}\`\``, block.fg, "big")
    .addTextBox(`Put \`w${ingName}\`\` in the oven! Select the temperature to start cooking:`)
    .embed("tilex", block.x)
    .embed("tiley", block.y)
    .embed("cookthis", itemId)
    .addButton("low", "`2Low Heat``")
    .addButton("med", "`9Medium Heat``")
    .addButton("high", "`4High Heat``")
    .endDialog("homeoven_edit", "Cancel", "")
    .str();

  player.variants.sendOnDialogRequest(dialog);
}

registerDialog("homeoven_edit", async (player, action) => {
  const world = player.world;
  if (!world) return;

  const tileX = action.getInt("tilex", -1);
  const tileY = action.getInt("tiley", -1);
  const itemId = action.getInt("cookthis", 0);
  const button = action.get("buttonClicked");

  const tempLevel =
    button === "low" ? OVEN_HEAT.LOW : button === "med" ? OVEN_HEAT.MED : button === "high" ? OVEN_HEAT.HIGH : OVEN_HEAT.OFF;
  if (tempLevel === OVEN_HEAT.OFF || itemId <= 0) return;

  const block = world.getTileAt(tileX, tileY);
  if (!block || !isOvenTile(block)) return;

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) {
    player.sendTextBubble("You don't have permission to use that oven!", true);
    return;
  }

  if (block.oven && block.oven.tempLevel > 0) {
    player.sendTextBubble("This oven is already cooking!", true);
    return;
  }

  if (!player.inventory.hasItem(itemId)) {
    player.sendTextBubble(`You don't have any ${itemName(itemId)}!`, true);
    return;
  }

  if (player.removeItemInven(itemId, 1, true) <= 0) return;

  block.oven = {
    tempLevel,
    startedAt: Date.now(),
    chefPlayerId: player.playerId,
    chefNetId: player.netID,
    ingredients: [{ itemId, timeAddedMs: 0 }],
    spices: { salt: 0, pepper: 0, sugar: 0 },
    lastTickSec: 0,
  };

  world.sendItemEffect(itemId, player, player);
  world.playPositioned("audio/MenuClick.wav", player.netID);
  tileFrom(world, block).tileUpdate();
  world.markDirty();

  player.sendTextBubble(`\`2[\`w${itemName(itemId)}\`\` is still cold.]\`\``, true);
});

/**
 * Merges Tomato (962) + Habanero Pepper (712) into Salsa (4560) inside the oven
 * when both are placed near the start of cooking.
 */
function tryMergeSalsaInOven(ingredients: OvenIngredient[], newItemId: number, elapsedLowMs: number): boolean {
  if (newItemId === 712) {
    const tomato = ingredients.find((i) => i.itemId === 962 && Math.abs(i.timeAddedMs - elapsedLowMs) <= 8000);
    if (tomato) {
      tomato.itemId = SALSA;
      return true;
    }
  } else if (newItemId === 962) {
    const habanero = ingredients.find((i) => i.itemId === 712 && Math.abs(i.timeAddedMs - elapsedLowMs) <= 8000);
    if (habanero) {
      habanero.itemId = SALSA;
      return true;
    }
  }
  return false;
}

/**
 * Handles placing an ingredient or spice into a Cooking Oven tile.
 * Called from both `tank-handler.ts` (before `useConsumable` so consumable
 * ingredients like Egg, Milk, Tomato, Blueberry, etc. go into the oven)
 * and `OvenTile.onItemPlace`.
 * @returns true when the action was handled by the oven.
 */
export async function handleOvenItemPlace(
  player: Player,
  world: World,
  block: TileData,
  itemId: number,
): Promise<boolean> {
  if (!isOvenTile(block)) return false;

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) {
    player.sendTextBubble("You don't have permission to use that oven!", true);
    return true;
  }

  if (!player.inventory.hasItem(itemId)) return true;

  const oven = block.oven;

  // Empty / inactive oven: start cooking with the first ingredient
  if (!oven || oven.tempLevel === OVEN_HEAT.OFF) {
    if (OVEN_SPICES.has(itemId)) {
      player.sendTextBubble("Put an ingredient in the oven before adding spices!", true);
      return true;
    }
    if (!OVEN_COOKABLE_INGREDIENTS.has(itemId)) {
      player.sendTextBubble("You can't cook that!", true);
      return true;
    }
    openOvenHeatDialog(player, block, itemId);
    return true;
  }

  // Active oven: spices can be added anytime
  if (OVEN_SPICES.has(itemId)) {
    if (player.removeItemInven(itemId, 1, true) <= 0) return true;
    if (itemId === SALT) {
      oven.spices.salt++;
      player.sendTextBubble("You salted your food!", true);
    } else if (itemId === PEPPER) {
      oven.spices.pepper++;
      player.sendTextBubble("You spiced your food with pepper!", true);
    } else if (itemId === SUGAR) {
      oven.spices.sugar++;
      player.sendTextBubble("You sweetened your food with sugar!", true);
    }
    world.sendItemEffect(itemId, player, player);
    world.playPositioned("audio/spray.wav", player.netID);
    world.markDirty();
    return true;
  }

  if (!OVEN_COOKABLE_INGREDIENTS.has(itemId)) {
    player.sendTextBubble("You can't put that in the oven!", true);
    return true;
  }

  const elapsedLowMs = getOvenElapsedLowMs(oven);

  // Check if Tomato + Habanero Pepper merges into Salsa (4560) in-place
  if ((itemId === 712 || itemId === 962) && tryMergeSalsaInOven(oven.ingredients, itemId, elapsedLowMs)) {
    if (player.removeItemInven(itemId, 1, true) <= 0) return true;
    world.sendItemEffect(itemId, player, player);
    world.playPositioned("audio/MenuClick.wav", player.netID);
    tileFrom(world, block).tileUpdate();
    world.markDirty();
    player.sendTextBubble("`2[`wSalsa`` is sizzling in the oven!]``", true);
    return true;
  }

  if (oven.ingredients.length >= MAX_OVEN_INGREDIENTS) {
    player.sendTextBubble("The oven is full! It can't hold any more ingredients.", true);
    return true;
  }

  if (player.removeItemInven(itemId, 1, true) <= 0) return true;

  oven.ingredients.push({
    itemId,
    timeAddedMs: elapsedLowMs,
  });

  world.sendItemEffect(itemId, player, player);
  world.playPositioned("audio/MenuClick.wav", player.netID);
  tileFrom(world, block).tileUpdate();
  world.markDirty();

  player.sendTextBubble(`\`2[\`w${itemName(itemId)}\`\` is still cold.]\`\``, true);
  return true;
}

/**
 * Normalizes the oven's placed ingredients for recipe matching.
 * If a recipe expects Salsa (4560) and the player placed Tomato (962) + Onion (4602)
 * or Tomato (962) + Habanero Pepper (712), they are combined into Salsa (4560).
 */
function normalizeIngredientsForRecipe(placed: readonly OvenIngredient[], recipe: OvenRecipe): OvenIngredient[] {
  const copy = placed.map((ing) => ({ ...ing }));
  const needsSalsa = recipe.ingredients.some((i) => i.id === SALSA);
  if (needsSalsa && !copy.some((i) => i.itemId === SALSA)) {
    const tomatoIdx = copy.findIndex((i) => i.itemId === 962);
    const partnerIdx = copy.findIndex((i) => i.itemId === 712 || i.itemId === 4602);
    if (tomatoIdx !== -1 && partnerIdx !== -1) {
      const tomato = copy[tomatoIdx]!;
      tomato.itemId = SALSA;
      copy.splice(partnerIdx, 1);
    }
  }
  return copy;
}

/**
 * Evaluates how well the oven state matches a given recipe and returns the quality (0..100),
 * or -1 if the required ingredients do not match the recipe.
 */
function scoreRecipeMatch(oven: OvenData, recipe: OvenRecipe, elapsedLowSec: number): number {
  const placed = normalizeIngredientsForRecipe(oven.ingredients, recipe);
  const usedIndices = new Set<number>();

  let totalTimingPenalty = 0;
  let matchedCount = 0;

  for (const req of recipe.ingredients) {
    const idx = placed.findIndex((p, i) => !usedIndices.has(i) && p.itemId === req.id);
    if (idx === -1) {
      if (req.optional) continue;
      return -1;
    }
    usedIndices.add(idx);
    matchedCount++;

    if (req.timeSec >= 0) {
      const addedSec = placed[idx]!.timeAddedMs / 1000;
      const diffSec = Math.abs(addedSec - req.timeSec);
      // Allow a 2.5s grace window per ingredient before accruing penalty
      const penalty = Math.max(0, diffSec - 2.5) * 2.2;
      totalTimingPenalty += Math.min(35, penalty);
    }
  }

  // Any extra foreign ingredients that are not part of this recipe invalidate the match
  if (usedIndices.size !== placed.length || matchedCount === 0) {
    return -1;
  }

  // Overall cook duration penalty
  const durationDiff = Math.abs(elapsedLowSec - recipe.durationSec);
  const durationPenalty = Math.max(0, durationDiff - 2.0) * 2.5;

  // Spice accuracy penalty (each missing or extra spice costs 4% quality)
  const wantSalt = recipe.spices.salt ?? 0;
  const wantPepper = recipe.spices.pepper ?? 0;
  const wantSugar = recipe.spices.sugar ?? 0;
  const spiceDiff =
    Math.abs(oven.spices.salt - wantSalt) +
    Math.abs(oven.spices.pepper - wantPepper) +
    Math.abs(oven.spices.sugar - wantSugar);
  const spicePenalty = spiceDiff * 4;

  const rawQuality = 100 - totalTimingPenalty / matchedCount - durationPenalty - spicePenalty;
  return Math.max(0, Math.min(100, Math.round(rawQuality)));
}

/**
 * Finishes cooking when a running oven is punched.
 */
export function finishOvenCooking(player: Player, world: World, block: TileData): void {
  const oven = block.oven;
  if (!oven || oven.tempLevel === OVEN_HEAT.OFF) return;

  const elapsedLowSec = getOvenElapsedLowMs(oven) / 1000;

  let bestRecipe: OvenRecipe | undefined;
  let bestQuality = -1;

  for (const recipe of OVEN_RECIPES) {
    const score = scoreRecipeMatch(oven, recipe, elapsedLowSec);
    if (score > bestQuality) {
      bestQuality = score;
      bestRecipe = recipe;
    }
  }

  // Clear oven state and update tile visuals
  delete block.oven;
  tileFrom(world, block).tileUpdate();
  world.markDirty();

  // Quality bonuses from Exquisite Rolling Pin (7310) and Sweet Potato Tots buff (cooking_gas)
  if (bestRecipe && bestQuality > 0) {
    if (player.inventory.clothes.hand === EXQUISITE_ROLLING_PIN) {
      bestQuality = Math.min(100, bestQuality + 2);
    }
    if (player.playMods.has("cooking_gas")) {
      bestQuality = Math.min(100, bestQuality + 5);
    }
  }

  // Check Chef role level requirement
  const chefLevel = player.quests.role("cook").lvl;
  if (bestRecipe?.minChefLevel && chefLevel < bestRecipe.minChefLevel) {
    giveOrDropItem(player, world, BLAND_MUSH, 1);
    world.playPositioned("audio/splat.wav", player.netID);
    player.sendTextBubble(
      `You need \`wChef Level ${bestRecipe.minChefLevel}\`\` to cook \`2${bestRecipe.name}\`\`! You made \`wBland Mush\`\` instead.`,
      true,
    );
    return;
  }

  const minEdibleQuality = block.fg === MASTER_CHEFS_OVEN ? 50 : 60;

  // No matching recipe, or severely burnt
  if (!bestRecipe || elapsedLowSec > bestRecipe.durationSec + 25) {
    giveOrDropItem(player, world, DISGUSTING_MESS, 1);
    world.sendParticleEffect(45, block.x * 32 + 16, block.y * 32 + 16);
    world.playPositioned("audio/splat.wav", player.netID);
    player.sendTextBubble("Ugh! You cooked a `4Disgusting Mess``!", true);
    player.addXp(5);
    return;
  }

  // Matched recipe, but undercooked or poor timing
  if (bestQuality < minEdibleQuality) {
    giveOrDropItem(player, world, BLAND_MUSH, 1);
    world.playPositioned("audio/splat.wav", player.netID);
    player.sendTextBubble(
      `Your timing was off (${bestQuality}% quality) and it turned into \`wBland Mush\`\`!`,
      true,
    );
    player.addXp(10);
    return;
  }

  // Determine final dish item ID (including Magnifico Carne Guacamole quality tiers)
  let dishId = bestRecipe.resultId;
  if (bestRecipe.qualityVariants) {
    for (const variant of bestRecipe.qualityVariants) {
      if (bestQuality >= variant.minQuality) {
        dishId = variant.itemId;
        break;
      }
    }
  }

  // Replicator (6412) has a 20% chance to duplicate the dish
  const replicated = block.fg === REPLICATOR && Math.random() < REPLICATOR_DUPLICATE_CHANCE;
  const dishCount = replicated ? 2 : 1;

  giveOrDropItem(player, world, dishId, dishCount);
  world.sendItemEffect(dishId, player, player);
  world.sendParticleEffect(46, block.x * 32 + 16, block.y * 32 + 16);
  world.playPositioned("audio/success.wav", player.netID);

  const dishName = itemName(dishId);
  let message = `You cooked \`2${dishName}\`\` (\`$${bestQuality}% quality\`\`)!`;
  if (replicated) {
    message += " `bThe Replicator created a temporal copy (2x)!``";
  }

  // High quality (95%+) awards a Mac n' Cheese Star (4612) and any recipe-specific bonus
  if (bestQuality >= 95) {
    giveOrDropItem(player, world, MAC_N_CHEESE_STAR, 1);
    message += " You earned a `6Mac n' Cheese Star``!";
    if (bestRecipe.perfectBonusItemId) {
      giveOrDropItem(player, world, bestRecipe.perfectBonusItemId, 1);
      message += ` Bonus: \`21 ${itemName(bestRecipe.perfectBonusItemId)}\`\`!`;
    }
  }

  player.sendTextBubble(message, true);
  player.variants.sendOnConsoleMessage(message);

  // XP & Role XP rewards (Player.addXp applies Eggs Benedict extra_xp and Gingerbread Cookie triple_xp mods)
  const xp = bestQuality >= 95 ? 200 : 100;
  player.addXp(xp);
  addRoleXp(player, "cook", bestQuality >= 95 ? 20 : 10);

  // Gemonade food buff: +300 bonus gems for completing a cooking recipe
  if (player.playMods.has("gemonade")) {
    player.addGems(300);
    player.variants.sendOnConsoleMessage("`2Gemonade bonus: +300 Gems for cooking a recipe!``");
  }
}

/**
 * Periodic 1-second tick for all active ovens in a world.
 * Emits stage notifications as ingredients warm up, cook, reach perfection, or burn.
 */
export function tickCooking(world: World): void {
  if (world.players.length === 0) return;
  const now = Date.now();

  for (const block of world.data.blocks) {
    const oven = block.oven;
    if (!oven || oven.tempLevel === OVEN_HEAT.OFF) continue;

    const elapsedLowSec = Math.floor(getOvenElapsedLowMs(oven, now) / 1000);
    if (elapsedLowSec <= oven.lastTickSec) continue;

    const prevSec = oven.lastTickSec;
    oven.lastTickSec = elapsedLowSec;

    // Find the chef in the world (or fall back to any player in the world for the tile bubble)
    const chef = world.players.find((p) => p.playerId === oven.chefPlayerId) ?? world.players[0];

    // Auto-burnout if left running way too long
    if (elapsedLowSec >= OVEN_BURNOUT_LOW_SEC) {
      delete block.oven;
      tileFrom(world, block).tileUpdate();
      if (chef) {
        world.drop(chef, block.x * 32 + 8, block.y * 32 + 8, DISGUSTING_MESS, 1, { tree: true });
        world.broadcastVariant(
          Variant.from("OnTalkBubble", chef.netID, "`4The food in the oven burned to a crisp!``", 0, 1),
        );
      }
      world.sendParticleEffect(45, block.x * 32 + 16, block.y * 32 + 16);
      world.markDirty();
      continue;
    }

    // Check if a matching recipe has reached its exact target cook duration
    for (const recipe of OVEN_RECIPES) {
      const targetSec = Math.round(recipe.durationSec);
      if (prevSec < targetSec && elapsedLowSec >= targetSec) {
        if (scoreRecipeMatch(oven, recipe, recipe.durationSec) >= 50 && chef) {
          world.sendParticleEffect(36, block.x * 32 + 16, block.y * 32 + 16);
          chef.sendTextBubble(`\`2[\`w${recipe.name}\`\` is cooked to \`$Perfection!\`\` Punch the oven now!]\`\``, true);
        }
      }
    }

    // Emit stage transitions for the first ingredient as a helpful visual cue
    const firstIng = oven.ingredients[0];
    if (firstIng && chef) {
      const ingAgeSec = Math.floor((getOvenElapsedLowMs(oven, now) - firstIng.timeAddedMs) / 1000);
      const name = itemName(firstIng.itemId);
      if (ingAgeSec === 15) {
        chef.sendTextBubble(`\`2[\`w${name}\`\` is uncooked.]\`\``, true);
      } else if (ingAgeSec === 35) {
        chef.sendTextBubble(`\`2[\`w${name}\`\` is mostly cooked.]\`\``, true);
      } else if (ingAgeSec === 125) {
        chef.sendTextBubble(`\`4[\`w${name}\`\` is burning!]\`\``, true);
      }
    }
  }
}
