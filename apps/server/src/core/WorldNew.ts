import type { WorldData, TileData, Coordinate } from "@growserver/types";
import type { Base } from "./Base";
import { ExtendBuffer } from "@growserver/utils";
import { TileFlags } from "@growserver/const";

export class World {
  public data: WorldData;

  constructor(private base: Base, public name: string) {
    // @ts-expect-error TODO: we skip this for now
    this.data = undefined;
  }

  public async getTile(x: number, y: number) {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return undefined;

    const offset = this.getIndex(x, y) * 8;
    const tile = new ExtendBuffer(0);

    tile.data.copy(this.data.tileMap.data, 0, offset, offset + 8);
    tile.mempos = 0;

    const block: TileData = {
      fg:     tile.readU16(),
      bg:     tile.readU16(),
      parent: this.getCoord(tile.readU16()),
      flags:  tile.readU16(),
    };

    if (block.flags & TileFlags.LOCKED) 
      block.parentLock =  this.getCoord(tile.readU16());

    return block;
  }

  public getIndex(x: number, y: number): number {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return -1;
    return x + (y * this.data.width);
  }

  public getCoord(index: number): Coordinate {
    return {
      x: index % this.data.width,
      y: Math.floor(index / this.data.width)
    };
  }

  
}