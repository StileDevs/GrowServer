import { ITEM_ID, TileFlags, WEATHER_CLEAR, WORLD_SIZE, Y_END_DIRT, Y_LAVA_START, Y_START_DIRT } from "../constants";
import type { TileData, WorldData } from "../types";

/**
 * Generates the classic procedural world: sky, a dirt layer with rocks and
 * lava near the bottom, a bedrock floor and one main door placed at a random
 * column on the surface.
 */
export function generateDefaultWorld(name: string, width = WORLD_SIZE.WIDTH, height = WORLD_SIZE.HEIGHT): WorldData {
  const blocks: TileData[] = [];
  const mainDoorX = Math.floor(Math.random() * width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const block: TileData = { x, y, fg: 0, bg: 0, flags: 0 };

      if (y === Y_START_DIRT - 1 && x === mainDoorX) {
        block.fg = ITEM_ID.MAIN_DOOR;
        block.door = { label: "EXIT", destination: "EXIT" };
        block.flags |= TileFlags.PUBLIC | TileFlags.TILEEXTRA;
      } else if (y >= Y_START_DIRT) {
        block.bg = ITEM_ID.CAVE_BACKGROUND;

        if (x === mainDoorX && y === Y_START_DIRT) {
          // bedrock right under the main door so it can never fall away
          block.fg = ITEM_ID.BEDROCK;
        } else if (y >= Y_END_DIRT) {
          block.fg = ITEM_ID.BEDROCK;
        } else if (y >= Y_LAVA_START) {
          const roll = Math.random();
          block.fg = roll > 0.2 ? (Math.random() > 0.1 ? ITEM_ID.DIRT : ITEM_ID.ROCK) : ITEM_ID.LAVA;
        } else {
          block.fg = Math.random() > 0.01 ? ITEM_ID.DIRT : ITEM_ID.ROCK;
        }
      }

      blocks.push(block);
    }
  }

  return {
    name,
    width,
    height,
    blocks,
    dropped: { uid: 0, items: [] },
    weather: { id: WEATHER_CLEAR },
  };
}
