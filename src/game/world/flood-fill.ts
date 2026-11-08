import { getItem } from "../item/item-utils";
import type { Player } from "../player";
import { tileFrom, tileUpdateMultiple } from "./tiles";
import type { Tile } from "./tile";
import type { World } from "./world";
import type { TileData } from "./types";
import { ActionTypes, ITEM_ID, LockPermission, LOCKS, TileFlags } from "./constants";

/** Blocks an area lock never claims, by item id and by action type. */
export const TileIgnore = {
  blockIdsToIgnoreByLock: [ITEM_ID.MAIN_DOOR, ITEM_ID.BEDROCK] as readonly number[],
  blockActionTypesToIgnore: [ActionTypes.LOCK, ActionTypes.MAIN_DOOR, ActionTypes.BEDROCK] as readonly number[],
};

/** Neighbour offsets in exploration order: north, west, south, east. */
const DIRECTIONS = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 0 },
] as const;

interface Node {
  x: number;
  y: number;
}

export interface FloodFillOptions {
  world: World;
  /** The lock tile the fill starts from. */
  lock: TileData;
  /** How many tiles the lock may own (the lock tile itself is not counted). */
  maxTiles: number;
  /** Skip tiles that have neither a foreground nor a background block. */
  ignoreEmptyAir: boolean;
}

/**
 * Breadth-first flood fill used by area locks: starting at the lock, claims up
 * to `maxTiles` 4-connected tiles, skipping tiles owned by another lock, tiles
 * in `TileIgnore` and (optionally) empty air.
 */
export class FloodFill {
  /** Claimed tiles in discovery order, without the lock tile itself. */
  public nodes: Node[] = [];

  constructor(public options: FloodFillOptions) {}

  private get world(): World {
    return this.options.world;
  }

  private indexOf(node: Node): number {
    return node.x + node.y * this.world.width;
  }

  /** Whether a tile is already owned by the lock this fill runs for. */
  private isOwnedByThisLock(tile: TileData): boolean {
    const { lock } = this.options;
    return tile.lockedBy !== undefined && tile.lockedBy.parentX === lock.x && tile.lockedBy.parentY === lock.y;
  }

  private canClaim(tile: TileData): boolean {
    if (tile.lockedBy && !this.isOwnedByThisLock(tile)) return false;
    if (tile.lock) return false;

    const meta = getItem(tile.fg || tile.bg);
    const itemId = meta?.id ?? 0;
    if (TileIgnore.blockIdsToIgnoreByLock.includes(itemId)) return false;
    if (this.options.ignoreEmptyAir && !itemId) return false;
    if (TileIgnore.blockActionTypesToIgnore.includes(meta?.type ?? 0)) return false;

    return true;
  }

  private neighbours(node: Node): Node[] {
    const result: Node[] = [];
    for (const dir of DIRECTIONS) {
      const x = node.x + dir.x;
      const y = node.y + dir.y;
      if (x < 0 || x >= this.world.width || y < 0 || y >= this.world.height) continue;
      result.push({ x, y });
    }
    return result;
  }

  /**
   * Runs the fill and stores the claimed tiles in `nodes`.
   */
  public exec(): this {
    const { lock, maxTiles } = this.options;
    const start: Node = { x: lock.x, y: lock.y };
    const visited = new Set<number>([this.indexOf(start)]);
    const queue: Node[] = [start];
    this.nodes = [];

    outer: while (queue.length > 0) {
      const node = queue.shift()!;

      for (const neighbour of this.neighbours(node)) {
        const index = this.indexOf(neighbour);
        if (visited.has(index)) continue;
        visited.add(index);

        const tile = this.world.getTileByIndex(index);
        if (!tile || !this.canClaim(tile)) continue;

        if (this.nodes.length >= maxTiles) break outer;

        queue.push(neighbour);
        this.nodes.push(neighbour);
      }
    }

    return this;
  }

  /**
   * Writes the result into the world: creates the lock data when missing,
   * marks the claimed tiles as owned by the lock, releases tiles the lock no
   * longer reaches and broadcasts every changed tile.
   * @returns the tiles that were sent to the clients.
   */
  public apply(world: World, owner: Player): Tile[] {
    const lockTile = this.options.lock;
    const lockMeta = LOCKS.find((l) => l.id === lockTile.fg);

    if (!lockTile.lock) {
      lockTile.lock = {
        ownerPlayerId: owner.playerId,
        adminLimited: false,
        ignoreEmptyAir: this.options.ignoreEmptyAir,
        adminIds: [],
        permission: lockMeta?.defaultPermission ?? LockPermission.NONE,
        ownedTiles: [],
      };
    }
    lockTile.lock.ignoreEmptyAir = this.options.ignoreEmptyAir;

    const claimed = new Set<number>();
    const changed: Tile[] = [tileFrom(world, lockTile)];

    for (const node of this.nodes) {
      if (node.x === lockTile.x && node.y === lockTile.y) continue;
      const index = this.indexOf(node);
      const tile = world.getTileByIndex(index);
      if (!tile) continue;

      claimed.add(index);
      tile.lockedBy = { parentX: lockTile.x, parentY: lockTile.y };
      tile.flags |= TileFlags.LOCKED;
      changed.push(tileFrom(world, tile));
    }

    // release the tiles this lock owned before but does not reach any more
    for (const index of lockTile.lock.ownedTiles) {
      if (claimed.has(index)) continue;
      const tile = world.getTileByIndex(index);
      if (!tile || !this.isOwnedByThisLock(tile)) continue;

      delete tile.lockedBy;
      tile.flags &= ~TileFlags.LOCKED;
      changed.push(tileFrom(world, tile));
    }

    lockTile.lock.ownedTiles = [...claimed];

    world.markDirty();
    tileUpdateMultiple(world, changed);

    return changed;
  }
}
