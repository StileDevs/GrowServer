import { TILE_EXTRA_TYPES, TILE_FLAGS, Y_END_DIRT, Y_LAVA_START, Y_START_DIRT } from "../../../constants";
import { Tile } from "../tile";
import { WorldGenerator, type WorldGenResult } from "./world-generator";

/**
 * Standard Growtopia default world generator.
 * Supports default 100x60 worlds as well as custom world dimensions up to 255x255.
 */
export class DefaultWorldGenerator extends WorldGenerator {
  public weather = 41;

  constructor(
    worldName: string,
    width = 100,
    height = 60,
  ) {
    super(worldName, width, height);
  }

  /**
   * Generates a world with sky, dirt, cave background, lava, and bedrock.
   * If custom dimensions are specified, layer boundaries scale proportionally.
   */
  public generate(): WorldGenResult {
    const tiles: Tile[] = [];
    const mainDoorPosition = Math.floor(Math.random() * this.width);

    // Calculate layer boundaries (exact constants for standard 60-height, scaled for custom height)
    const yStartDirt = this.height === 60 ? Y_START_DIRT : Math.max(1, Math.floor(this.height * (Y_START_DIRT / 60)));
    const yLavaStart = this.height === 60 ? Y_LAVA_START : Math.max(yStartDirt + 1, Math.floor(this.height * (Y_LAVA_START / 60)));
    const yEndDirt = this.height === 60 ? Y_END_DIRT : Math.max(yLavaStart + 1, Math.floor(this.height * (Y_END_DIRT / 60)));
    const mainDoorY = yStartDirt - 1;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let fg = 0;
        let bg = 0;
        let flags = TILE_FLAGS.NONE;
        let extra = undefined;

        // Sky layer
        if (y < yStartDirt) {
          if (y === mainDoorY && x === mainDoorPosition) {
            fg = 6; // Main Door
            bg = 0;
            flags = TILE_FLAGS.PUBLIC | TILE_FLAGS.TILEEXTRA;
            extra = {
              type: TILE_EXTRA_TYPES.DOOR as const,
              label: "EXIT",
              destination: "EXIT",
            };
          }
        } else {
          // Underground layer
          bg = 14; // Cave Dirt background

          if (x === mainDoorPosition && y === yStartDirt) {
            fg = 8; // Bedrock foundation beneath main door
          } else if (y < yEndDirt) {
            if (y >= yLavaStart) {
              // Deep layer with lava and rock pockets
              fg = Math.random() > 0.2 ? (Math.random() > 0.1 ? 2 : 10) : 4;
            } else {
              // Upper dirt layer with occasional rocks
              fg = Math.random() > 0.01 ? 2 : 10;
            }
          } else {
            // Bedrock layer at bottom of world
            fg = 8;
          }
        }

        tiles.push(
          new Tile({
            x,
            y,
            fg,
            bg,
            flags,
            extra,
          }),
        );
      }
    }

    return {
      width: this.width,
      height: this.height,
      tiles,
      weather: this.weather,
    };
  }
}

export const Default = DefaultWorldGenerator;
