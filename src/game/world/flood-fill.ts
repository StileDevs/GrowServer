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

/**
 * The shape an area lock covers when nothing is in its way, as offsets from
 * the lock, nearest first. These are the patterns of the real game:
 * - small lock (10): the 3x3 around the lock plus one tile left and right;
 * - big lock (48): a 7x7 square;
 * - huge and builder's lock (200): a 15x15 square without its corners.
 */
function defaultShape(maxTiles: number): Node[] {
  const offsets: Node[] = [];
  const radius = maxTiles <= 10 ? 2 : maxTiles <= 48 ? 3 : 7;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const cheb = Math.max(Math.abs(dx), Math.abs(dy));
      const manhattan = Math.abs(dx) + Math.abs(dy);
      if (maxTiles <= 10 && cheb === 2 && !(dy === 0)) continue;
      if (maxTiles > 48 && manhattan > 11) continue;
      offsets.push({ x: dx, y: dy });
    }
  }

  offsets.sort((a, b) => distance(a) - distance(b));
  return offsets.slice(0, maxTiles);
}

function distance(offset: Node): number {
  return offset.x * offset.x + offset.y * offset.y;
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
 * Area claim used by area locks. The lock first takes its default shape
 * (`defaultShape`), skipping tiles another lock owns, bedrock, doors and
 * (optionally) empty air. When some of those tiles were unavailable, the
 * lock spreads to the nearest reachable tiles beyond its shape until it owns
 * `maxTiles`, like the real game.
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

  private inBounds(node: Node): boolean {
    return node.x >= 0 && node.x < this.world.width && node.y >= 0 && node.y < this.world.height;
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
      const next = { x: node.x + dir.x, y: node.y + dir.y };
      if (this.inBounds(next)) result.push(next);
    }
    return result;
  }

  /**
   * Runs the claim and stores the claimed tiles in `nodes`.
   */
  public exec(): this {
    const { lock, maxTiles } = this.options;
    const start: Node = { x: lock.x, y: lock.y };
    const startIndex = this.indexOf(start);
    const claimed = new Set<number>([startIndex]);
    this.nodes = [];

    // 1. the default shape, nearest tiles first
    for (const offset of defaultShape(maxTiles)) {
      if (this.nodes.length >= maxTiles) break;
      const node = { x: start.x + offset.x, y: start.y + offset.y };
      if (!this.inBounds(node)) continue;

      const index = this.indexOf(node);
      const tile = this.world.getTileByIndex(index);
      if (!tile || !this.canClaim(tile)) continue;

      claimed.add(index);
      this.nodes.push(node);
    }

    // 2. spread from the lock and the claimed tiles to the nearest free tiles
    const rejected = new Set<number>();
    while (this.nodes.length < maxTiles) {
      let best: Node | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const from of [start, ...this.nodes]) {
        for (const next of this.neighbours(from)) {
          const index = this.indexOf(next);
          if (claimed.has(index) || rejected.has(index)) continue;

          const tile = this.world.getTileByIndex(index);
          if (!tile || !this.canClaim(tile)) {
            rejected.add(index);
            continue;
          }

          const dist = distance({ x: next.x - start.x, y: next.y - start.y });
          if (dist < bestDistance) {
            bestDistance = dist;
            best = next;
          }
        }
      }

      if (!best) break;
      claimed.add(this.indexOf(best));
      this.nodes.push(best);
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
