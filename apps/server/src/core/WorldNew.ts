import type { WorldData } from "@growserver/types";
import type { Base } from "./Base";

export class World {
  public data: WorldData;

  constructor(private base: Base, public name: string) {
    // @ts-expect-error TODO: we skip this for now
    this.data = undefined;
  }

  public async getTile(x: number, y: number) {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return undefined;

    const index = this.getIndex(x, y);

    return this.data.tileMap.data[index];
  }

  public getIndex(x: number, y: number) {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return -1;
    return x + (y * this.data.width);
  }

  public getCoord(index: number) {
    return {
      x: index % this.data.width,
      y: Math.floor(index / this.data.width)
    };
  }
}