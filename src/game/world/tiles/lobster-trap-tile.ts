import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { getItem } from "../../item/item-utils";
import { FISHING_BAITS } from "../../fishing/fishing-manager";
import { returnFishOrDrop } from "../../fishing/fish-inventory";
import { getFishMaxWeight } from "../../fishing/fish-weights";
import type { Player } from "../../player";
import { ActionTypes, LockPermission, TileFlags } from "../constants";
import { Tile } from "../tile";
import type { TileData } from "../types";
import type { World } from "../world";

/** Item id of the lobster trap. */
export const LOBSTER_TRAP = 3448;
/** Tile extra type byte (see the default extra layout: [34]). */
const EXTRA_TYPE = 34;
/** Bait needed to load a trap. */
const BAIT_COST = 5;
/** The trap takes between one and two days to fill. */
const MIN_READY_MS = 24 * 60 * 60 * 1000;
const MAX_READY_MS = 48 * 60 * 60 * 1000;
/** A trap left ready for longer than this loses the catch. */
const LEFTOVER_MS = 24 * 60 * 60 * 1000;
/** Water buckets above the trap raise the maximum size, up to this depth. */
const MAX_DEPTH = 3;

/** Crab and equipment pools unlocked by bait quality and water depth. */
const COMMON = [3458, 3452, 3460];
const LOBSTER = [...COMMON, 3450];
const DUNGEON = [...LOBSTER, 3456];
const KING = [...DUNGEON, 3454];
const ALL = [...KING, 3464, 3812, 4760, 12448];
const TRAP_TIERS = [
  { baits: [2914], maxLbs: 5, pools: [COMMON, COMMON, COMMON, COMMON] },
  { baits: [3012, 4246], maxLbs: 15, pools: [COMMON, COMMON, LOBSTER, DUNGEON] },
  { baits: [3014], maxLbs: 25, pools: [LOBSTER, DUNGEON, DUNGEON, DUNGEON] },
  { baits: [3016, 4248], maxLbs: 40, pools: [DUNGEON, DUNGEON, KING, [...KING, 3464, 12448]] },
  { baits: [3018, 3098, 3218], maxLbs: 50, pools: [DUNGEON, DUNGEON, [...KING, 3464], ALL] },
  { baits: [3020], maxLbs: 200, pools: [ALL, ALL, ALL, ALL] },
];

/** Resolves the wiki's bait/depth reward table; unlisted bait uses the basic tier. */
export function getLobsterTrapRewards(baitId: number, depth: number): { maxLbs: number; pool: readonly number[] } {
  const tier = TRAP_TIERS.find((entry) => entry.baits.includes(baitId)) ?? TRAP_TIERS[0]!;
  const level = Math.max(0, Math.min(MAX_DEPTH, Math.floor(depth)));
  return { maxLbs: baitId === 3020 ? 200 : tier.maxLbs * (1 + level), pool: tier.pools[level]! };
}
/**
 * Lobster Trap: load it with five bait, wait one to two days and punch it to
 * collect a crab. Water buckets stacked above raise the maximum size.
 * Extra data layout: the single extra type byte 34.
 */
export class LobsterTrapTile extends Tile {
  public override serializedFlags(flags: number): number {
    return flags | TileFlags.TILEEXTRA | (this.data.trap ? TileFlags.OPEN : 0);
  }

  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(EXTRA_TYPE);
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;
    this.data.flags |= TileFlags.TILEEXTRA;
    delete this.data.trap;
    this.world.markDirty();
    this.tileUpdate();
    return true;
  }

  /** Water buckets placed directly above the trap, up to `MAX_DEPTH`. */
  public depth(): number {
    let depth = 0;
    for (let step = 1; step <= MAX_DEPTH; step++) {
      const above = this.world.getTileAt(this.data.x, this.data.y - step);
      if (!above || (above.flags & TileFlags.WATER) === 0) break;
      depth++;
    }
    return depth;
  }

  /** Wrenching explains how the trap works; it needs no build permission. */
  public override async onWrench(player: Player): Promise<boolean> {
    const trap = this.data.trap;
    if (!trap) {
      player.sendTextBubble("Put 5 of any bait in here to start trapping!", true);
      return true;
    }
    const left = Math.max(0, Math.ceil((trap.readyAt - Date.now()) / 1000));
    player.sendTextBubble(
      left > 0 ? "The trap is still working. Check back later!" : "The trap is ready! Punch it to collect.",
      true,
    );
    return true;
  }

  /** Removes the trap state when the block is broken. */
  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.trap;
  }

  public override async onPunch(player: Player): Promise<boolean> {
    if (this.data.fg === 0) return true;

    const trap = this.data.trap;
    // an empty trap is an ordinary block: punching damages and breaks it
    if (!trap) return super.onPunch(player);

    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPunchFail(player);
      return false;
    }
    // Another punch may have harvested this trap while permission was resolving.
    if (this.data.trap !== trap) return true;

    const now = Date.now();
    if (now < trap.readyAt) {
      // occasionally the bait is gone when you check early
      if (Math.random() < 0.2) {
        delete this.data.trap;
        this.world.markDirty();
        this.tileUpdate();
        player.sendTextBubble("`4The bait was eaten!``", true);
      } else {
        player.sendTextBubble("Nothing yet... The trap needs more time.", true);
      }
      return true;
    }

    if (now > trap.readyAt + LEFTOVER_MS) {
      delete this.data.trap;
      this.world.markDirty();
      this.tileUpdate();
      player.sendTextBubble("`4You left the trap for too long, the baits are gone!``", true);
      return true;
    }

    const tier = getLobsterTrapRewards(trap.baitId, this.depth());
    const caught = tier.pool[Math.floor(Math.random() * tier.pool.length)] ?? 3458;
    const fishMax = getFishMaxWeight(caught);
    const lbs = fishMax > 0 ? Math.floor(Math.random() * Math.min(tier.maxLbs, fishMax)) + 1 : 1;
    delete this.data.trap;
    if (fishMax > 0) {
      returnFishOrDrop(player, this.world, caught, lbs, this.data.x, this.data.y);
    } else if (player.addItemInven(caught, 1) <= 0) {
      this.world.drop(player, this.data.x * 32, this.data.y * 32, caught, 1);
    }
    this.world.markDirty();
    this.tileUpdate();
    this.world.playPositioned("audio/getpoint.wav", player.netID);
    player.sendTextBubble(`You caught a \`2${fishMax > 0 ? `${lbs} lb. ` : ""}${getItem(caught)?.name ?? caught}\`w!\`\``, true);
    return true;
  }
}

/**
 * Loads a lobster trap with five bait. Called when bait is used on the trap.
 * @returns true when the tile is a lobster trap (handled or refused).
 */
export async function loadLobsterTrap(player: Player, world: World, block: TileData, itemId: number): Promise<boolean> {
  if (block.fg !== LOBSTER_TRAP) return false;
  if (!FISHING_BAITS.has(itemId)) return false;

  if (block.trap) {
    player.sendTextBubble("This trap already has bait in it!", true);
    return true;
  }

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) {
    player.sendTextBubble("You don't have permission to use that trap!", true);
    return true;
  }
  if (block.trap || block.fg !== LOBSTER_TRAP) return true;

  if (player.inventory.getAmount(itemId) < BAIT_COST) {
    player.sendTextBubble(`You need ${BAIT_COST} ${getItem(itemId)?.name ?? "bait"} to load the trap!`, true);
    return true;
  }

  if (player.removeItemInven(itemId, BAIT_COST, true) !== BAIT_COST) return true;
  const now = Date.now();
  block.trap = {
    baitId: itemId,
    startedAt: now,
    readyAt: now + MIN_READY_MS + Math.floor(Math.random() * (MAX_READY_MS - MIN_READY_MS)),
  };
  world.markDirty();
  new LobsterTrapTile(world, block).tileUpdate();
  world.playPositioned("audio/water_splash.wav", player.netID);
  player.sendTextBubble(`You loaded the trap with ${BAIT_COST} ${getItem(itemId)?.name ?? "bait"}. Check back in a day or two!`, true);
  return true;
}

/** Whether a tile is a lobster trap (helper for the input handler). */
export function isLobsterTrap(block: TileData | undefined): boolean {
  return !!block && getItem(block.fg)?.type === ActionTypes.LOBSTER_TRAP;
}
