import { Tile } from "../tile";
import { ActionTypes, ITEM_ID, LockPermission } from "../constants";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import type { TileData } from "../types";
import type { World } from "../world";

/**
 * Cutting Board (Item ID 3470).
 *
 * Mechanics:
 * - A player punches the Cutting Board while holding a Sushi Knife (3466) or Butcher Knife (4506).
 * - Slices dropped fish resting on the board into Fish Chunks (3468).
 * - Yield Formula:
 *   - Fish weight >= 10 lb: 1 Fish Chunk per 10 lb (Math.floor(weight / 10)).
 *   - Fish weight < 10 lb: 1 Fish Chunk, with a 20% fail chance where the cut is ruined.
 * - Slicing broadcasts particle/sfx, removes the dropped fish, and drops the Fish Chunks.
 */
export class CuttingBoardTile extends Tile {
  public constructor(world: World, data: TileData) {
    super(world, data);
  }

  public override async onPunch(player: Player): Promise<boolean> {
    const handItem = player.inventory.clothes.hand;
    const isCuttingTool = handItem === ITEM_ID.SUSHI_KNIFE || handItem === ITEM_ID.BUTCHER_KNIFE;

    // If not holding a cutting tool, behave like a normal punch
    if (!isCuttingTool) {
      return super.onPunch(player);
    }

    // Check lock / tile permission for interacting with the cutting board
    if (!player.isDeveloper && !(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPunchFail(player);
      return false;
    }

    // Find dropped items resting on or near this cutting board
    const tileCenterX = this.data.x * 32 + 16;
    const tileCenterY = this.data.y * 32 + 16;

    const nearbyDrops = this.world.data.dropped.items.filter((item) => {
      if (item.block.x === this.data.x && item.block.y === this.data.y) return true;
      const dx = item.x - tileCenterX;
      const dy = item.y - tileCenterY;
      return Math.hypot(dx, dy) <= 32;
    });

    const fishDrop = nearbyDrops.find((item) => getItem(item.id)?.type === ActionTypes.PETFISH);

    // If no fish is on the cutting board, punch normally
    if (!fishDrop) {
      return super.onPunch(player);
    }

    // Slice the fish
    const weight = fishDrop.amount;
    const fishMeta = getItem(fishDrop.id);
    const fishName = fishMeta?.name ?? "Fish";

    const isSmall = weight < 10;
    const failed = isSmall && Math.random() < 0.2;
    const chunks = failed ? 0 : Math.max(1, Math.floor(weight / 10));

    // Remove the fish from the world
    this.world.removeDrop(fishDrop.uid, player);

    // Play cutting sound effects
    this.world.playPositioned("audio/splat.wav", player.netID);

    if (chunks > 0) {
      this.world.drop(player, tileCenterX, tileCenterY, ITEM_ID.FISH_CHUNK, chunks, {
        noSimilar: false,
        tree: true,
      });

      const chunkLabel = chunks === 1 ? "1 Fish Chunk" : `${chunks} Fish Chunks`;
      player.variants.sendOnConsoleMessage(`You sliced the \`2${weight} lb. ${fishName}\`\` into \`2${chunkLabel}\`\`!`);
      player.sendTextBubble(`\`2Sliced into ${chunkLabel}!\`\``, true);
    } else {
      player.variants.sendOnConsoleMessage(`\`4Oops! You butchered the cut and ruined the ${fishName}!\`\``);
      player.sendTextBubble("`4Ruined the cut!``", true);
    }

    return true;
  }

  public override async onWrench(player: Player): Promise<boolean> {
    player.sendTextBubble("`oPlace a fish on this board and slice it with a Sushi Knife or Butcher Knife!``", true);
    return true;
  }
}
