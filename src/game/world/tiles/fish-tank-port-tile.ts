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

const MAX_FISH_PER_TANK = 10;

/**
 * Fish Tank Port (Item ID 3002).
 *
 * Rules:
 * - Must be placed on top of a Fish Tank background block (ITEM_ID.FISH_TANK = 3004).
 * - Stores and displays fish swimming in the connected tank.
 * - Fish size scales automatically with its weight (lb), and 200 lb perfect fish emit a glow.
 * - Only the world owner / build permitted players can add or retrieve fish.
 */
export class FishTankPortTile extends Tile {
  public extraType = TileExtraTypes.FISHTANK;

  public constructor(world: World, data: TileData) {
    super(world, data);
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (this.data.bg !== ITEM_ID.FISH_TANK) {
      player.sendTextBubble("You can only place this on a Fish Tank!", true);
      return false;
    }

    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.data.flags |= TileFlags.TILEEXTRA | TileFlags.OPEN | TILE_ALT_MODE;
    this.data.fishTank = { fishes: [], glowing: true };
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    const fishes = this.data.fishTank?.fishes ?? [];
    await super.onDestroy(player);
    delete this.data.fishTank;

    // Return any fish inside to the player or drop in the world
    for (const fish of fishes) {
      const added = player.addItemInven(fish.id, fish.weight);
      if (added <= 0) {
        this.world.drop(player, this.data.x * 32, this.data.y * 32, fish.id, fish.weight, { noSimilar: true });
      }
    }
    if (fishes.length > 0) player.sendInventory();
  }

  public override serializedFlags(flags: number): number {
    const glowing = this.data.fishTank?.glowing !== false;
    return flags | TileFlags.TILEEXTRA | (glowing ? TileFlags.OPEN : 0);
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(this.extraType);
    const fishes = this.data.fishTank?.fishes ?? [];
    const glowing = this.data.fishTank?.glowing !== false;
    buffer.writeU8(glowing ? 1 : 0);
    // Growtopia client loops: for (int i = 0; i < fish_count / 2; i++)
    // Therefore fish_count must be the count of uint32 values (fishes.length * 2)
    buffer.writeU32(fishes.length * 2);
    for (const f of fishes) {
      buffer.writeU32(f.id);
      buffer.writeU32(f.weight);
    }
  }

  public override async onWrench(player: Player): Promise<boolean> {
    if (!player.isDeveloper && !(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      player.sendTextBubble("Only the world owner can mess with fishies!", true);
      return true;
    }

    const fishes = this.data.fishTank?.fishes ?? [];
    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon("`wFish Tank Port``", ITEM_ID.FISH_TANK_PORT, "big")
      .addSpacer("small")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y);

    if (fishes.length === 0) {
      dialog.addTextBox("The fish tank is currently empty. Place some caught fish inside!");
    } else {
      dialog.addTextBox(`\`wFish in Tank (${fishes.length}/${MAX_FISH_PER_TANK}):\`\``);
      for (let i = 0; i < fishes.length; i++) {
        const fish = fishes[i]!;
        const name = getItem(fish.id)?.name ?? "Fish";
        const perfectNote = fish.weight >= 200 ? " `#(Perfect!)``" : "";
        dialog.addLabelWithIcon(`\`2#${i + 1}: \`w${fish.weight} lb. ${name}${perfectNote}\`\``, fish.id, "small");
        dialog.addButton(`retrieve_${i}`, "Retrieve to Backpack");
        dialog.addSpacer("small");
      }
      dialog.addCustomBreak();
    }

    if (fishes.length < MAX_FISH_PER_TANK) {
      const petFishInven: Array<{ id: number; amount: number }> = [];
      for (const [id, amount] of player.inventory.items) {
        if (getItem(id)?.type === ActionTypes.PETFISH) {
          petFishInven.push({ id, amount });
        }
      }

      if (petFishInven.length > 0) {
        dialog.addSpacer("small").addTextBox("`wAdd a fish from your backpack:`\``");
        for (const it of petFishInven) {
          const name = getItem(it.id)?.name ?? "Fish";
          dialog.addButtonWithIcon(`addfish_${it.id}`, it.id, `Add ${it.amount} lb. ${name}`);
        }
        dialog.addCustomBreak();
      } else {
        dialog.addSpacer("small").addSmallText("`4You don't have any fish in your backpack to add.`\``");
      }
    }

    dialog.addSpacer("small");
    dialog.addCustomBreak();
    dialog.addCheckbox("chk_glowing", "Glowing Fish (for 200 lb & Megafishes)", this.data.fishTank?.glowing !== false ? "selected" : "not_selected");
    dialog.addSpacer("small");
    dialog.addCustomBreak();
    dialog.endDialog("fishtank_port_dialog", "Close", "Update");
    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }
}

registerDialog("fishtank_port_dialog", (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target || !(target.block.fg === ITEM_ID.FISH_TANK_PORT)) return;

  const tileData = target.block;
  if (!tileData.fishTank) tileData.fishTank = { fishes: [], glowing: true };
  const fishes = tileData.fishTank.fishes;
  const button = action.get("buttonClicked");

  if (action.contains("chk_glowing")) {
    const isGlowing = action.get("chk_glowing") === "1";
    tileData.fishTank.glowing = isGlowing;
    if (isGlowing) {
      tileData.flags |= TileFlags.OPEN;
    } else {
      tileData.flags &= ~TileFlags.OPEN;
    }
    target.world.markDirty();
    new FishTankPortTile(target.world, tileData).tileUpdate();

    if (button === "" || button === "update") {
      player.sendTextBubble(isGlowing ? "`2Fish glow turned ON!``" : "`4Fish glow turned OFF!``", true);
      player.variants.sendOnConsoleMessage(isGlowing ? "`2Fish tank glow enabled.``" : "`4Fish tank glow disabled.``");
    }
  }

  // Adding a fish
  if (button.startsWith("addfish_")) {
    const fishId = Number.parseInt(button.replace("addfish_", ""), 10);
    if (!fishId || isNaN(fishId)) return;

    const owned = player.inventory.getAmount(fishId);
    if (owned <= 0) {
      player.sendTextBubble("You don't have that fish in your inventory!", true);
      return;
    }

    if (fishes.length >= MAX_FISH_PER_TANK) {
      player.sendTextBubble("This Fish Tank is full!", true);
      return;
    }

    player.removeItemInven(fishId, owned);
    fishes.push({ id: fishId, weight: owned });
    target.world.markDirty();

    new FishTankPortTile(target.world, tileData).tileUpdate();
    player.sendInventory();
    player.sendSfx("audio/splash.wav");

    const fishName = getItem(fishId)?.name ?? "Fish";
    const perfectStr = owned >= 200 ? " `#(Perfect!)``" : "";
    player.variants.sendOnConsoleMessage(`You put the \`2${owned} lb. ${fishName}${perfectStr}\`\` into the Fish Tank!`);
    player.sendTextBubble(`\`2Added ${owned} lb. ${fishName}!${perfectStr}\`\``, true);
    return;
  }

  // Retrieving a fish
  if (button.startsWith("retrieve_")) {
    const i = Number.parseInt(button.replace("retrieve_", ""), 10);
    const fish = fishes[i];
    if (!fish) return;

    if (player.inventory.isFull && !player.inventory.hasItem(fish.id)) {
      player.sendTextBubble("Your backpack is full!", true);
      return;
    }

    fishes.splice(i, 1);
    target.world.markDirty();

    player.addItemInven(fish.id, fish.weight);
    player.sendInventory();
    player.sendSfx("audio/splash.wav");

    new FishTankPortTile(target.world, tileData).tileUpdate();

    const fishName = getItem(fish.id)?.name ?? "Fish";
    player.variants.sendOnConsoleMessage(`You retrieved the \`2${fish.weight} lb. ${fishName}\`\` from the Fish Tank!`);
    player.sendTextBubble(`\`2Retrieved ${fishName}!\`\``, true);
    return;
  }
});
