import { isFishPerfect, getFishMaxWeight } from "../../fishing/fish-weights";
import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import { ActionTypes, ITEM_ID, LockPermission, TileExtraTypes, TileFlags, TILE_ALT_MODE } from "../constants";
import type { TileData } from "../types";
import type { World } from "../world";

/** XP required per level (index is current level, values match Growtopia wiki). */
export const TRAINING_LEVEL_XP: readonly number[] = [
  0,
  100,  // Level 1 -> 2
  150,  // Level 2 -> 3
  175,  // Level 3 -> 4
  250,  // Level 4 -> 5
  350,  // Level 5 -> 6
  450,  // Level 6 -> 7
  600,  // Level 7 -> 8
  750,  // Level 8 -> 9
  1000, // Level 9 -> 10
  1500, // Level 10 (completed)
];

export interface TrainingRewardTier {
  itemId: number;
  weight: number;
}

/** Official Growtopia Level 10 Fish and Crab graduation rewards and chances. */
export const FISH_TRAINING_REWARDS: Readonly<Record<number, readonly TrainingRewardTier[]>> = {
  3000: [{ itemId: 5586, weight: 80 }, { itemId: 5604, weight: 20 }], // Goldfish -> Leash (80%), Bowler Hat (20%)
  3024: [{ itemId: 5598, weight: 100 }], // Whale -> Whale Leash (100%)
  3026: [{ itemId: 5588, weight: 75 }, { itemId: 5606, weight: 25 }], // Catfish -> Leash (75%), Slippers (25%)
  3030: [{ itemId: 5596, weight: 75 }, { itemId: 5608, weight: 25 }], // Dogfish -> Leash (75%), Slippers (25%)
  3032: [{ itemId: 5570, weight: 100 }], // Gar -> Battle Gar (100%)
  3034: [{ itemId: 5594, weight: 100 }], // Mahi Mahi -> Mahi Mahi Leash (100%)
  3036: [{ itemId: 5590, weight: 100 }], // Sunfish -> Sunfish Leash (100%)
  3038: [{ itemId: 5592, weight: 100 }], // Bass -> Bass Leash (100%)
  3092: [{ itemId: 7134, weight: 80 }, { itemId: 7118, weight: 20 }], // Skeletal Shark -> Leash (80%), Riding (20%)
  3434: [{ itemId: 5736, weight: 85 }, { itemId: 5738, weight: 15 }], // Rainbowfish -> Leash (85%), Rainbow Cape (15%)
  3436: [{ itemId: 5986, weight: 80 }, { itemId: 5988, weight: 20 }], // Totally Legit Bunnyfish -> Leash (80%), Bunny Ears (20%)
  3438: [{ itemId: 5568, weight: 75 }, { itemId: 5566, weight: 25 }], // Seahorse -> Leash (75%), Riding (25%)
  3440: [{ itemId: 5572, weight: 100 }], // Mutant Fish -> Battle Mutant Fish (100%)
  3450: [{ itemId: 11126, weight: 75 }, { itemId: 11148, weight: 25 }], // Lobster -> Leash (75%), Shoes (25%)
  3452: [{ itemId: 11122, weight: 75 }, { itemId: 11144, weight: 25 }], // Purple Shore Crab -> Leash (75%), Headband (25%)
  3454: [{ itemId: 11130, weight: 80 }, { itemId: 11152, weight: 20 }], // Alaskan King Crab -> Leash (80%), Crown (20%)
  3456: [{ itemId: 8606, weight: 80 }, { itemId: 8604, weight: 20 }], // Dungeonist Crab -> Leash (80%), Crab Claw & Shield (20%)
  3458: [{ itemId: 11124, weight: 75 }, { itemId: 11146, weight: 25 }], // Crawdad -> Leash (75%), Shoes (25%)
  3460: [{ itemId: 11128, weight: 70 }, { itemId: 11150, weight: 20 }, { itemId: 14612, weight: 10 }], // Hermit Crab -> Leash (70%), Helmet (20%), Shell (10%)
  3544: [{ itemId: 5600, weight: 75 }, { itemId: 5610, weight: 25 }], // Picasso Triggerfish -> Leash (75%), Face (25%)
  3550: [{ itemId: 6036, weight: 70 }, { itemId: 6038, weight: 20 }, { itemId: 10032, weight: 10 }], // Axolotl -> Leash (70%), Riding (20%), Slippers (10%)
  3620: [{ itemId: 6106, weight: 75 }, { itemId: 6108, weight: 25 }], // Pineapple Fish -> Leash (75%), Tiki Mask (25%)
  3746: [{ itemId: 6318, weight: 75 }, { itemId: 6320, weight: 25 }], // Firefin -> Leash (75%), Flaming Floaties (25%)
  3814: [{ itemId: 5560, weight: 75 }, { itemId: 5558, weight: 25 }], // Stonefish -> Leash (75%), Riding (25%)
  4958: [{ itemId: 5564, weight: 75 }, { itemId: 5562, weight: 25 }], // Sand Shark -> Leash (75%), Riding (25%)
  5100: [{ itemId: 7060, weight: 75 }, { itemId: 7022, weight: 25 }], // Koi Fish -> Leash (75%), Mengu Armor (25%)
  5538: [{ itemId: 5540, weight: 100 }], // Maidmare Fish -> Maidmare Ride (100%)
  5542: [{ itemId: 5546, weight: 75 }, { itemId: 5544, weight: 25 }], // Double-Headed Angel-Devil Fish -> Leash (75%), Riding (25%)
  5548: [{ itemId: 5550, weight: 100 }], // Absolutely Real Elephant Fish -> Leash (100%)
  5552: [{ itemId: 5556, weight: 75 }, { itemId: 5554, weight: 25 }], // Cuttlefish -> Leash (75%), Riding (25%)
  5574: [{ itemId: 5578, weight: 75 }, { itemId: 5576, weight: 25 }], // Alpha Great White Shark -> Leash (75%), Riding (25%)
  5580: [{ itemId: 5584, weight: 100 }], // Weird Manta Ray -> Leash (100%)
  7744: [{ itemId: 7746, weight: 100 }], // Dragon Turtle -> Dragon Turtle Charm (100%)
  8460: [{ itemId: 8462, weight: 75 }, { itemId: 8464, weight: 25 }], // Clockwork Fish -> Leash (75%), Eyes (25%)
  10264: [{ itemId: 14066, weight: 75 }, { itemId: 14062, weight: 25 }], // Turkey Fish -> Leash (75%), Mohawk (25%)
};

export enum FishHungerLevel {
  STARVING = 0,
  HUNGRY = 1,
  SLIGHTLY_HUNGRY = 2,
  CONTENT = 3,
  MODERATELY_FULL = 4,
  SUPER_FULL = 5,
}

export const HUNGER_DISPLAY: Record<number, { name: string; color: string }> = {
  [FishHungerLevel.STARVING]: { name: "Starving", color: "`4" },
  [FishHungerLevel.HUNGRY]: { name: "Hungry", color: "`4" },
  [FishHungerLevel.SLIGHTLY_HUNGRY]: { name: "Slightly Hungry", color: "`9" },
  [FishHungerLevel.CONTENT]: { name: "Content", color: "`2" },
  [FishHungerLevel.MODERATELY_FULL]: { name: "Moderately Full", color: "`e" },
  [FishHungerLevel.SUPER_FULL]: { name: "Super Full", color: "`e" },
};

/**
 * Updates hunger and health states based on time elapsed since last feeding.
 */
export function updateTrainingPortState(tp: NonNullable<TileData["trainingPort"]>): void {
  if (tp.fishId <= 0) return;
  if (tp.hunger === undefined) tp.hunger = FishHungerLevel.CONTENT;
  if (tp.isDead) {
    tp.status = 7; // Dead
    return;
  }

  const now = Date.now();
  const elapsedHours = (now - (tp.lastFed || now)) / (1000 * 60 * 60);

  // If starved for more than 24h -> Dies
  if (tp.hunger <= FishHungerLevel.STARVING && elapsedHours >= 24) {
    tp.isDead = true;
    tp.status = 7;
    return;
  }

  // Hunger drops 1 level every 2 hours
  const hungerDrop = Math.floor(elapsedHours / 2);
  if (hungerDrop > 0) {
    tp.hunger = Math.max(0, tp.hunger - hungerDrop);
    tp.lastFed = now - ((elapsedHours % 2) * 1000 * 60 * 60);
  }

  if (tp.isSick) {
    tp.status = 6; // Sick
  } else {
    tp.status = tp.hunger;
  }
}

function pickReward(tiers: readonly TrainingRewardTier[]): number {
  const total = tiers.reduce((acc, t) => acc + t.weight, 0);
  let roll = Math.random() * total;
  for (const t of tiers) {
    if (roll < t.weight) return t.itemId;
    roll -= t.weight;
  }
  return tiers[0]!.itemId;
}

/**
 * Training Port (Item ID 5530).
 *
 * Rules:
 * - Placed on top of a Fish Tank background block (ITEM_ID.FISH_TANK = 3004).
 * - Only accepts perfect fish and enormous crabs (species maximum weight).
 * - Fed using Fish Chunks (+1 XP), Fish Flakes (+50 XP), or caught fish.
 * - Shows authentic hunger states: Starving, Hungry, Slightly Hungry, Content, Moderately Full, Super Full.
 * - Feeding past Super Full makes the fish sick (cured using Fish Medicine, 5532).
 * - Prolonged starvation leads to death (revived using Fish Reviver, 5534).
 * - Graduating at Level 10 yields exclusive species-specific leashes, hats, and mounts.
 */
export class TrainingPortTile extends Tile {
  public extraType = TileExtraTypes.TRAINING_PORT;

  public constructor(world: World, data: TileData) {
    super(world, data);
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (this.data.bg !== ITEM_ID.FISH_TANK) {
      player.sendTextBubble("This port can only be placed on a Fish Tank!", true);
      return false;
    }

    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.trainingPort = {
      fishId: 0,
      weight: 0,
      level: 0,
      exp: 0,
      status: 0,
      lastFed: 0,
      hunger: FishHungerLevel.CONTENT,
      isSick: false,
      isDead: false,
    };
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    const tp = this.data.trainingPort;
    await super.onDestroy(player);
    delete this.data.trainingPort;

    if (tp && tp.fishId > 0 && tp.weight > 0) {
      const added = player.addItemInven(tp.fishId, tp.weight);
      if (added <= 0) {
        this.world.drop(player, this.data.x * 32, this.data.y * 32, tp.fishId, tp.weight, { noSimilar: true });
      }
      player.sendInventory();
    }
  }

  public override serializedFlags(flags: number): number {
    const hasFish = (this.data.trainingPort?.fishId ?? 0) > 0;
    return (flags & ~TILE_ALT_MODE) | TileFlags.TILEEXTRA | (hasFish ? TileFlags.OPEN : 0);
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(this.extraType); // 61
    const tp = this.data.trainingPort;
    if (tp) updateTrainingPortState(tp);
    buffer.writeU32(tp?.weight ?? 0);
    buffer.writeU16(tp?.status ?? 0);
    buffer.writeU32(tp?.fishId ?? 0);
    buffer.writeU32(tp?.exp ?? 0);
    buffer.writeU32(0);
    buffer.writeU32(0);
    buffer.writeU32(tp?.level ?? 0);
    buffer.writeU32(0);
    buffer.writeU32(0);
    buffer.writeU8(0);
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!player.isDeveloper && !(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      player.sendTextBubble("Only the world owner can train fish!", true);
      return true;
    }

    const tp = this.data.trainingPort;
    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y);

    if (!tp || tp.fishId <= 0) {
      dialog
        .addLabelWithIcon("`wFish Training Port``", ITEM_ID.TRAINING_PORT, "big")
        .addSpacer("small")
        .addTextBox("This port trains `2Perfect (maximum weight)`` fish and enormous crabs up to Level 10 to earn exclusive leashes, hats, and mounts!")
        .addSpacer("small");

      // Filter backpack for eligible perfect fish
      const petFishInven: Array<{ id: number; amount: number }> = [];
      for (const [id, amount] of player.inventory.items) {
        if (FISH_TRAINING_REWARDS[id] && isFishPerfect(id, amount)) {
          petFishInven.push({ id, amount });
        }
      }

      if (petFishInven.length > 0) {
        dialog.addTextBox("`wChoose a perfect fish or enormous crab from your backpack to train:`\``");
        for (const it of petFishInven) {
          const name = getItem(it.id)?.name ?? "Fish";
          dialog.addButtonWithIcon(`trainstart_${it.id}`, it.id, `Train ${it.amount} lb. ${name} (Perfect!)`);
        }
      } else {
        dialog.addSmallText("`4You don't have any perfect (maximum weight) fish in your backpack to train.`\``");
      }

      dialog.addCustomBreak().addSpacer("small").endDialog("training_port_dialog", "Close", "");
    } else {
      updateTrainingPortState(tp);
      const fishName = getItem(tp.fishId)?.name ?? "Fish";
      const requiredXp = TRAINING_LEVEL_XP[tp.level] ?? 1500;
      const hungerInfo = HUNGER_DISPLAY[tp.hunger ?? FishHungerLevel.CONTENT] ?? HUNGER_DISPLAY[FishHungerLevel.CONTENT]!;
      dialog
        .addLabelWithIcon("`wFish Training Port``", ITEM_ID.TRAINING_PORT, "big")
        .addSpacer("small")
        .addSmallText("This tank contains:")
        .addPlayerInfo(`${tp.weight}lb. ${fishName}`, tp.level, tp.exp, requiredXp)
        .addSpacer("small");

      if (tp.isDead) {
        dialog
          .addTextBox("`4Your fish is Dead``")
          .addTextBox("`4Your fish has died of starvation! Use a `2Fish Reviver`` to bring it back to life!``")
          .addSpacer("small")
          .addButton("train_revive", "Revive fish");
      } else if (tp.isSick) {
        dialog
          .addTextBox(`Your fish is ${hungerInfo.color}${hungerInfo.name}\`\``)
          .addTextBox("Your fish is sick and can't eat! Use a `2Fish Medicine`` to cure it before it starves!")
          .addSpacer("small")
          .addButton("train_cure", "Cure Sick fish");
      } else if (tp.level >= 10) {
        dialog
          .addTextBox(`Your fish is ${hungerInfo.color}${hungerInfo.name}\`\``)
          .addTextBox("`2★ LEVEL 10 MAX REACHED! Training is complete! ★``")
          .addSpacer("small")
          .addButton("train_claim_reward", "🏆 Claim Level 10 Reward & Graduate")
          .addSpacer("small")
          .addButton("train_retrieve", "Retrieve fish");
      } else {
        dialog
          .addTextBox(`Your fish is ${hungerInfo.color}${hungerInfo.name}\`\``)
          .addSpacer("small")
          .addItemPicker("feed_item", "`wFeed Your Fish:``", "Choose Food (Fish Chunk, Fish Flakes, or Fish)")
          .addButton("train_feed", "Feed")
          .addButton("train_retrieve", "Retrieve fish");

        const chunks = player.inventory.getAmount(ITEM_ID.FISH_CHUNK);
        const flakes = player.inventory.getAmount(ITEM_ID.FISH_FLAKES);
        if (chunks > 0) dialog.addButton("train_feed_chunk", `Feed 1x Fish Chunk (+1 XP) [x${chunks}]`);
        if (flakes > 0) dialog.addButton("train_feed_flakes", `Feed 1x Fish Flakes (+50 XP) [x${flakes}]`);
      }

      dialog
        .addCustomBreak()
        .addSpacer("small")
        .endDialog("training_port_dialog", "Close", "");
    }

    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }
}

registerDialog("training_port_dialog", (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target || !(target.block.fg === ITEM_ID.TRAINING_PORT)) return;

  const tileData = target.block;
  if (!tileData.trainingPort) {
    tileData.trainingPort = {
      fishId: 0,
      weight: 0,
      level: 0,
      exp: 0,
      status: 0,
      lastFed: 0,
      hunger: FishHungerLevel.CONTENT,
      isSick: false,
      isDead: false,
    };
  }
  const tp = tileData.trainingPort;
  updateTrainingPortState(tp);
  const button = action.get("buttonClicked");

  // Start training a fish
  if (button.startsWith("trainstart_")) {
    const fishId = Number.parseInt(button.replace("trainstart_", ""), 10);
    if (!fishId || isNaN(fishId)) return;

    const owned = player.inventory.getAmount(fishId);
    if (!isFishPerfect(fishId, owned)) {
      player.sendTextBubble(`Only perfect (${getFishMaxWeight(fishId)} lb.) fish can be trained!`, true);
      return;
    }

    player.removeItemInven(fishId, owned);
    tp.fishId = fishId;
    tp.weight = owned;
    tp.level = 1;
    tp.exp = 0;
    tp.hunger = FishHungerLevel.CONTENT;
    tp.status = FishHungerLevel.CONTENT;
    tp.isSick = false;
    tp.isDead = false;
    tp.lastFed = Date.now();
    target.world.markDirty();

    new TrainingPortTile(target.world, tileData).tileUpdate();
    player.sendInventory();
    player.sendSfx("audio/splash.wav");

    const fishName = getItem(fishId)?.name ?? "Fish";
    player.variants.sendOnConsoleMessage(`You placed the \`2${owned} lb. ${fishName} (Perfect!)\`\` in the Training Port!`);
    player.sendTextBubble(`\`2Started training ${owned} lb. ${fishName}!\`\``, true);
    return;
  }

  // Cure sick fish with Fish Medicine
  if (button === "train_cure" || action.contains("train_cure")) {
    if (tp.fishId <= 0) return;
    if (!tp.isSick) {
      player.sendTextBubble("Your fish is not sick!", true);
      return;
    }

    if (player.inventory.getAmount(ITEM_ID.FISH_MEDICINE) <= 0) {
      player.sendTextBubble("You don't have any Fish Medicine!", true);
      return;
    }

    player.removeItemInven(ITEM_ID.FISH_MEDICINE, 1);
    player.sendInventory();

    tp.isSick = false;
    tp.hunger = FishHungerLevel.MODERATELY_FULL;
    tp.status = tp.hunger;
    tp.lastFed = Date.now();

    target.world.markDirty();
    new TrainingPortTile(target.world, tileData).tileUpdate();

    player.sendSfx("audio/magic.wav");
    player.sendTextBubble("`2Your fish has been cured of sickness!``", true);
    player.variants.sendOnConsoleMessage("`2You used a Fish Medicine to cure your fish! It can now eat again.``");
    return;
  }

  // Revive dead fish with Fish Reviver
  if (button === "train_revive" || action.contains("train_revive")) {
    if (tp.fishId <= 0) return;
    if (!tp.isDead) {
      player.sendTextBubble("Your fish is already alive!", true);
      return;
    }

    if (player.inventory.getAmount(ITEM_ID.FISH_REVIVER) <= 0) {
      player.sendTextBubble("You don't have any Fish Reviver!", true);
      return;
    }

    player.removeItemInven(ITEM_ID.FISH_REVIVER, 1);
    player.sendInventory();

    tp.isDead = false;
    tp.isSick = false;
    tp.hunger = FishHungerLevel.HUNGRY;
    tp.status = tp.hunger;
    tp.lastFed = Date.now();

    target.world.markDirty();
    new TrainingPortTile(target.world, tileData).tileUpdate();

    player.sendSfx("audio/resurrect.wav");
    player.sendTextBubble("`2Your fish has been brought back to life!``", true);
    player.variants.sendOnConsoleMessage("`2You used a Fish Reviver to revive your fish!``");
    return;
  }

  // Feeding logic (via quick buttons or item chooser)
  const isFeedingChunk = button === "train_feed_chunk";
  const isFeedingFlakes = button === "train_feed_flakes";
  const isFeedingPicker = button === "train_feed" || action.contains("train_feed");

  if (isFeedingChunk || isFeedingFlakes || isFeedingPicker) {
    if (tp.fishId <= 0) return;

    let foodItemId = 0;
    if (isFeedingChunk) {
      foodItemId = ITEM_ID.FISH_CHUNK;
    } else if (isFeedingFlakes) {
      foodItemId = ITEM_ID.FISH_FLAKES;
    } else {
      foodItemId = action.getInt("feed_item", 0, 0);
    }

    if (foodItemId === 0) {
      player.sendTextBubble("Choose a food item from the item picker to feed your fish!", true);
      return;
    }

    // Using Fish Medicine via picker or button
    if (foodItemId === ITEM_ID.FISH_MEDICINE) {
      if (!tp.isSick) {
        player.sendTextBubble("Your fish is not sick!", true);
        return;
      }
      if (player.inventory.getAmount(ITEM_ID.FISH_MEDICINE) <= 0) {
        player.sendTextBubble("You don't have any Fish Medicine!", true);
        return;
      }
      player.removeItemInven(ITEM_ID.FISH_MEDICINE, 1);
      player.sendInventory();
      tp.isSick = false;
      tp.hunger = FishHungerLevel.CONTENT;
      tp.status = tp.hunger;
      tp.lastFed = Date.now();
      target.world.markDirty();
      new TrainingPortTile(target.world, tileData).tileUpdate();
      player.sendSfx("audio/heal.wav");
      player.sendTextBubble("`2Your fish has been cured of illness!``", true);
      player.variants.sendOnConsoleMessage("`2You used a Fish Medicine to cure your fish! It can now eat again.``");
      return;
    }

    // Using Fish Reviver via picker or button
    if (foodItemId === ITEM_ID.FISH_REVIVER) {
      if (!tp.isDead) {
        player.sendTextBubble("Your fish is not dead!", true);
        return;
      }
      if (player.inventory.getAmount(ITEM_ID.FISH_REVIVER) <= 0) {
        player.sendTextBubble("You don't have any Fish Reviver!", true);
        return;
      }
      player.removeItemInven(ITEM_ID.FISH_REVIVER, 1);
      player.sendInventory();
      tp.isDead = false;
      tp.isSick = false;
      tp.hunger = FishHungerLevel.HUNGRY;
      tp.status = tp.hunger;
      tp.lastFed = Date.now();
      target.world.markDirty();
      new TrainingPortTile(target.world, tileData).tileUpdate();
      player.sendSfx("audio/resurrect.wav");
      player.sendTextBubble("`2Your fish has been brought back to life!``", true);
      player.variants.sendOnConsoleMessage("`2You used a Fish Reviver to revive your fish!``");
      return;
    }

    if (tp.isDead) {
      player.sendTextBubble("Your fish has died! Use a Fish Reviver to bring it back to life.", true);
      return;
    }
    if (tp.isSick) {
      player.sendTextBubble("Your fish is sick and can't eat! Use a Fish Medicine first.", true);
      return;
    }
    if (tp.level >= 10) {
      player.sendTextBubble("Your fish has already reached max level 10!", true);
      return;
    }

    let xpGained = 0;
    let hungerGain = 1;

    if (foodItemId === ITEM_ID.FISH_CHUNK) {
      if (player.inventory.getAmount(ITEM_ID.FISH_CHUNK) <= 0) {
        player.sendTextBubble("You don't have any Fish Chunks!", true);
        return;
      }
      player.removeItemInven(ITEM_ID.FISH_CHUNK, 1);
      xpGained = 1; // 1 XP per chunk (wiki)
      hungerGain = 1;
    } else if (foodItemId === ITEM_ID.FISH_FLAKES) {
      if (player.inventory.getAmount(ITEM_ID.FISH_FLAKES) <= 0) {
        player.sendTextBubble("You don't have any Fish Flakes!", true);
        return;
      }
      player.removeItemInven(ITEM_ID.FISH_FLAKES, 1);
      xpGained = 50; // 50 XP per flakes (wiki)
      hungerGain = 2;
    } else if (getItem(foodItemId)?.type === ActionTypes.PETFISH) {
      const ownedWeight = player.inventory.getAmount(foodItemId);
      if (ownedWeight <= 0) {
        player.sendTextBubble("You don't have that fish in your inventory!", true);
        return;
      }
      player.removeItemInven(foodItemId, ownedWeight);
      xpGained = Math.max(2, Math.round(ownedWeight * 1.5));
      hungerGain = 2;
    } else {
      player.sendTextBubble("That item cannot be fed to fish! Choose Fish Chunks, Fish Flakes, or fish.", true);
      return;
    }

    player.sendInventory();

    // Check if fish was already Super Full -> becomes sick
    if ((tp.hunger ?? FishHungerLevel.CONTENT) >= FishHungerLevel.SUPER_FULL) {
      tp.isSick = true;
      tp.status = 6; // Sick
      player.sendSfx("audio/cough.wav");
      player.sendTextBubble("`4Your fish overate and became sick! It needs Fish Medicine!``", true);
      player.variants.sendOnConsoleMessage("`4Your fish is Super Full and got sick from overfeeding! Use a Fish Medicine to cure it.``");
    } else {
      tp.hunger = Math.min(FishHungerLevel.SUPER_FULL, (tp.hunger ?? FishHungerLevel.CONTENT) + hungerGain);
      tp.status = tp.hunger;
      tp.lastFed = Date.now();
      player.sendSfx("audio/eat.wav");
      const foodName = getItem(foodItemId)?.name ?? "Food";
      player.sendTextBubble(`\`2Fed ${foodName} (+${xpGained} XP)!\`\``, true);
    }

    // Add XP and handle level up
    tp.exp += xpGained;
    const requiredXp = TRAINING_LEVEL_XP[tp.level] ?? 1500;
    if (tp.exp >= requiredXp && tp.level < 10) {
      tp.level += 1;
      tp.exp -= requiredXp;
      player.sendSfx("audio/level_up.wav");
      player.variants.sendOnConsoleMessage(`Your fish reached \`2Training Level ${tp.level}\`\`!`);
      player.sendTextBubble(`\`2Level Up! (Level ${tp.level})\`\``, true);
    }

    target.world.markDirty();
    new TrainingPortTile(target.world, tileData).tileUpdate();
    return;
  }

  // Claim Level 10 Rewards
  if (button === "train_claim_reward" || action.contains("train_claim_reward")) {
    if (tp.fishId <= 0 || tp.level < 10) return;

    const fishId = tp.fishId;
    const weight = tp.weight;
    const fishName = getItem(fishId)?.name ?? "Fish";

    // Roll species reward
    const rewardTiers = FISH_TRAINING_REWARDS[fishId] ?? [{ itemId: 5624, weight: 100 }]; // fallback: Fancy Fish Wall Mount
    const rewardItemId = pickReward(rewardTiers);
    const rewardName = getItem(rewardItemId)?.name ?? "Exclusive Training Reward";

    // Award graduation reward
    const addedReward = player.addItemInven(rewardItemId, 1);
    if (addedReward <= 0) {
      target.world.drop(player, target.block.x * 32, target.block.y * 32, rewardItemId, 1, { noSimilar: true });
    }

    // Return the trained fish back to backpack
    const addedFish = player.addItemInven(fishId, weight);
    if (addedFish <= 0) {
      target.world.drop(player, target.block.x * 32, target.block.y * 32, fishId, weight, { noSimilar: true });
    }

    // Reset training port
    tp.fishId = 0;
    tp.weight = 0;
    tp.level = 0;
    tp.exp = 0;
    tp.status = 0;
    tp.hunger = FishHungerLevel.CONTENT;
    tp.isSick = false;
    tp.isDead = false;
    target.world.markDirty();

    new TrainingPortTile(target.world, tileData).tileUpdate();
    player.sendInventory();
    player.sendSfx("audio/level_up.wav");

    player.sendTextBubble(`\`2🏆 Your ${fishName} graduated Level 10! Obtained \`#${rewardName}\`\`!`, true);
    player.variants.sendOnConsoleMessage(`\`2Congratulations! Your ${fishName} has graduated from the Training Port! You received: \`#${rewardName}\`\`!`);
    return;
  }

  // Retrieve fish
  if (button === "train_retrieve" || action.contains("train_retrieve")) {
    if (tp.fishId <= 0) return;
    if (player.inventory.isFull && !player.inventory.hasItem(tp.fishId)) {
      player.sendTextBubble("Your backpack is full!", true);
      return;
    }

    const fishId = tp.fishId;
    const weight = tp.weight;
    tp.fishId = 0;
    tp.weight = 0;
    tp.level = 0;
    tp.exp = 0;
    tp.status = 0;
    tp.hunger = FishHungerLevel.CONTENT;
    tp.isSick = false;
    tp.isDead = false;
    target.world.markDirty();

    player.addItemInven(fishId, weight);
    player.sendInventory();
    player.sendSfx("audio/splash.wav");

    new TrainingPortTile(target.world, tileData).tileUpdate();

    const fishName = getItem(fishId)?.name ?? "Fish";
    player.variants.sendOnConsoleMessage(`You retrieved your \`2${weight} lb. ${fishName}\`\` from training!`);
    player.sendTextBubble(`\`2Retrieved ${fishName}!\`\``, true);
    return;
  }
});
