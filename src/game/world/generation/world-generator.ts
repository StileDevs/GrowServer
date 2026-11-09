import type { Tile } from "../tile";

export interface WorldGenResult {
  width: number;
  height: number;
  tiles: Tile[];
  weather: number;
}

/**
 * Abstract base class for procedural world generators.
 * Supports standard worlds (100x60) up to custom world sizes (max 255x255).
 */
export abstract class WorldGenerator {
  public width: number;
  public height: number;

  constructor(
    public worldName: string,
    width = 100,
    height = 60,
  ) {
    // Clamp world dimensions between 1 and 255
    this.width = Math.max(1, Math.min(255, Math.floor(width)));
    this.height = Math.max(1, Math.min(255, Math.floor(height)));
  }

  /**
   * Generates world tiles and metadata.
   */
  public abstract generate(): WorldGenResult;
}
