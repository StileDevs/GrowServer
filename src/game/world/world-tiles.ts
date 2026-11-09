import { TILE_EXTRA_TYPES } from "../../constants";
import type { ExtendBuffer } from "../../utils/extend-buffer";
import { Tile, type TileData } from "./tile";

/**
 * Manages the grid of tiles within a World using a direct 1D array.
 */
export class WorldTiles {
  public tiles: Tile[] = [];

  constructor(
    public width = 100,
    public height = 60,
  ) {
    this.width = Math.max(1, Math.min(255, Math.floor(width)));
    this.height = Math.max(1, Math.min(255, Math.floor(height)));
  }

  /**
   * Total number of tiles in the world grid.
   */
  public get count(): number {
    return this.tiles.length;
  }

  /**
   * Converts 2D (x, y) coordinates into a 1D linear array index.
   */
  public getIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  /**
   * Retrieves a tile by its 2D coordinates in O(1) time.
   */
  public get(x: number, y: number): Tile | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return undefined;
    }
    return this.tiles[this.getIndex(x, y)];
  }

  /**
   * Retrieves a tile by its 1D array index in O(1) time.
   */
  public getByIndex(index: number): Tile | undefined {
    return this.tiles[index];
  }

  /**
   * Sets or replaces a tile at (x, y).
   */
  public set(x: number, y: number, tile: Tile): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    this.tiles[this.getIndex(x, y)] = tile;
    return true;
  }

  /**
   * Updates partial data of a tile at (x, y).
   */
  public updateTile(x: number, y: number, update: Partial<TileData>): Tile | undefined {
    const tile = this.get(x, y);
    if (!tile) return undefined;

    if (update.fg !== undefined) tile.fg = update.fg;
    if (update.bg !== undefined) tile.bg = update.bg;
    if (update.flags !== undefined) tile.flags = update.flags;
    if (update.parentTileIndex !== undefined) tile.parentTileIndex = update.parentTileIndex;
    if (update.extra !== undefined) tile.extra = update.extra;

    return tile;
  }

  /**
   * Loads an entire array of tiles into the grid.
   */
  public loadTiles(tiles: Tile[]): void {
    this.tiles = tiles;
  }

  /**
   * Finds the Main Door tile ("EXIT") in the world.
   */
  public findMainDoor(): Tile | undefined {
    return this.tiles.find(
      (tile) =>
        tile.fg === 6 ||
        (tile.extra &&
          tile.extra.type === TILE_EXTRA_TYPES.DOOR &&
          tile.extra.label.toUpperCase() === "EXIT"),
    );
  }

  /**
   * Finds a door tile by its door label / identifier.
   */
  public findDoor(doorId: string): Tile | undefined {
    const cleanId = doorId.trim().toUpperCase();
    if (!cleanId) return this.findMainDoor();

    const door = this.tiles.find(
      (tile) =>
        tile.extra &&
        tile.extra.type === TILE_EXTRA_TYPES.DOOR &&
        tile.extra.label.toUpperCase() === cleanId,
    );

    return door ?? this.findMainDoor();
  }

  /**
   * Finds all tiles matching a predicate.
   */
  public findAll(predicate: (tile: Tile, index: number) => boolean): Tile[] {
    const result: Tile[] = [];
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i]!;
      if (predicate(tile, i)) {
        result.push(tile);
      }
    }
    return result;
  }

  /**
   * Finds the first tile matching a predicate.
   */
  public find(predicate: (tile: Tile, index: number) => boolean): Tile | undefined {
    return this.tiles.find(predicate);
  }

  /**
   * Alias to findAll.
   */
  public filter(predicate: (tile: Tile, index: number) => boolean): Tile[] {
    return this.findAll(predicate);
  }

  /**
   * Serializes all tiles sequentially into an ExtendBuffer.
   */
  public serialize(buf: ExtendBuffer): void {
    for (let i = 0; i < this.tiles.length; i++) {
      this.tiles[i]!.serialize(buf);
    }
  }

  /**
   * Deserializes tiles from an ExtendBuffer.
   */
  public deserialize(buf: ExtendBuffer, totalTiles = this.width * this.height): void {
    this.tiles = new Array(totalTiles);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = this.getIndex(x, y);
        this.tiles[index] = Tile.deserialize(x, y, buf);
      }
    }
  }

  /**
   * Returns all tiles as an array.
   */
  public toArray(): Tile[] {
    return this.tiles;
  }
}
