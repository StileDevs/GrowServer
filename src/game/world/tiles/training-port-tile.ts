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

/**
 * Training Port (Item ID 5530).
 *
 * Rules:
 * - Must be placed on top of a Fish Tank background block (ITEM_ID.FISH_TANK = 3004).
 * - Trains a fish/crab with levels 1-10 through feeding and workouts.
 * - Only the world owner can manage and train the fish.
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
    const isPerfect = (this.data.trainingPort?.weight ?? 0) >= 200;
    return flags | TileFlags.TILEEXTRA | (hasFish ? TileFlags.OPEN : 0) | (isPerfect ? TILE_ALT_MODE : 0);
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(this.extraType); // 61
    const tp = this.data.trainingPort;
    // Exactly 22 bytes matching Growtopia client deserialization:
    // u32 fish_lb, u16 fish_status, u32 fish_id, u32 fish_total_exp, u32 fish_level, u32 unknown_2
    buffer.writeU32(tp?.weight ?? 0);
    buffer.writeU16(tp?.status ?? 0);
    buffer.writeU32(tp?.fishId ?? 0);
    buffer.writeU32(tp?.exp ?? 0);
    buffer.writeU32(tp?.level ?? 0);
    buffer.writeU32(0);
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
        .addTextBox("This port is for adding or removing fish for Training! You can train your fish to level 10.")
        .addSpacer("small");

      const petFishInven: Array<{ id: number; amount: number }> = [];
      for (const [id, amount] of player.inventory.items) {
        if (getItem(id)?.type === ActionTypes.PETFISH) {
          petFishInven.push({ id, amount });
        }
      }

      if (petFishInven.length > 0) {
        dialog.addTextBox("`wChoose a fish from your backpack to train:`\``");
        for (const it of petFishInven) {
          const name = getItem(it.id)?.name ?? "Fish";
          dialog.addButtonWithIcon(`trainstart_${it.id}`, it.id, `Train ${it.amount} lb. ${name}`);
        }
      } else {
        dialog.addSmallText("`4You don't have any fish in your backpack to train.`\``");
      }

      dialog.endDialog("training_port_dialog", "Close", "");
    } else {
      const fishName = getItem(tp.fishId)?.name ?? "Fish";
      const maxExp = tp.level * 100 + 100;
      const statusText = tp.status === 1 ? "`4Hungry``" : tp.status === 2 ? "`5Tired``" : "`2Healthy & Energetic``";

      dialog
        .addLabelWithIcon(`\`wTraining: ${tp.weight} lb. ${fishName}\`\``, tp.fishId, "big")
        .addSpacer("small")
        .addSmallText(`Level: \`w${tp.level} / 10\`\``)
        .addSmallText(`Experience: \`w${tp.exp} / ${maxExp} XP\`\``)
        .addSmallText(`Status: ${statusText}`)
        .addSpacer("small")
        .addButton("train_feed", "Feed Fish (+25 XP)")
        .addButton("train_workout", "Train / Workout (+35 XP)")
        .addSpacer("small")
        .addButton("train_retrieve", "Retrieve to Backpack")
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
    };
  }
  const tp = tileData.trainingPort;
  const button = action.get("buttonClicked");

  // Start training a fish
  if (button.startsWith("trainstart_")) {
    const fishId = Number.parseInt(button.replace("trainstart_", ""), 10);
    if (!fishId || isNaN(fishId)) return;

    const owned = player.inventory.getAmount(fishId);
    if (owned <= 0) {
      player.sendTextBubble("You don't have that fish in your inventory!", true);
      return;
    }

    player.removeItemInven(fishId, owned);
    tp.fishId = fishId;
    tp.weight = owned;
    tp.level = 1;
    tp.exp = 0;
    tp.status = 0;
    tp.lastFed = Date.now();
    target.world.markDirty();

    new TrainingPortTile(target.world, tileData).tileUpdate();
    player.sendInventory();
    player.sendSfx("audio/splash.wav");

    const fishName = getItem(fishId)?.name ?? "Fish";
    const perfectStr = owned >= 200 ? " `#(Perfect!)``" : "";
    player.variants.sendOnConsoleMessage(`You placed the \`2${owned} lb. ${fishName}${perfectStr}\`\` in the Training Port!`);
    player.sendTextBubble(`\`2Started training ${fishName}!${perfectStr}\`\``, true);
    return;
  }

  // Feed the fish
  if (button === "train_feed" || action.contains("train_feed")) {
    if (tp.fishId <= 0) return;
    tp.exp += 25;
    tp.status = 0;
    tp.lastFed = Date.now();

    const maxExp = tp.level * 100 + 100;
    if (tp.exp >= maxExp && tp.level < 10) {
      tp.level += 1;
      tp.exp -= maxExp;
      player.sendSfx("audio/level_up.wav");
      player.variants.sendOnConsoleMessage(`Your fish reached \`2Training Level ${tp.level}\`\`!`);
      player.sendTextBubble(`\`2Level Up! (Level ${tp.level})\`\``, true);
    } else {
      player.sendSfx("audio/eat.wav");
      player.sendTextBubble("`2Yum! The fish enjoyed the meal (+25 XP).`\``", true);
    }

    target.world.markDirty();
    new TrainingPortTile(target.world, tileData).tileUpdate();
    return;
  }

  // Workout / Train the fish
  if (button === "train_workout" || action.contains("train_workout")) {
    if (tp.fishId <= 0) return;
    tp.exp += 35;
    tp.status = Math.random() < 0.3 ? 1 : 0; // chance to become hungry

    const maxExp = tp.level * 100 + 100;
    if (tp.exp >= maxExp && tp.level < 10) {
      tp.level += 1;
      tp.exp -= maxExp;
      player.sendSfx("audio/level_up.wav");
      player.variants.sendOnConsoleMessage(`Your fish reached \`2Training Level ${tp.level}\`\`!`);
      player.sendTextBubble(`\`2Level Up! (Level ${tp.level})\`\``, true);
    } else {
      player.sendSfx("audio/punch_locked.wav");
      player.sendTextBubble("`2The fish did some training exercises (+35 XP)!`\``", true);
    }

    target.world.markDirty();
    new TrainingPortTile(target.world, tileData).tileUpdate();
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
