import CryptoJS from "crypto-js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { Collection } from "../structures/Collection";
import { PeerDataType } from "../types/peer";
import { World } from "../structures/World";

export function parseAction(chunk: Buffer): Record<string, string | number> | undefined {
  const data: Record<string, string | number> = {};
  chunk[chunk.length - 1] = 0;

  const str = chunk.toString("utf-8", 4);
  const lines = str.split("\n");

  lines.forEach((line) => {
    if (line.startsWith("|")) line = line.slice(1);
    const info = line.split("|");

    const key = info[0];
    let val = info[1];

    if (key && val) {
      if (val.endsWith("\x00")) val = val.slice(0, -1);
      data[key] = val;
    }
  });

  return data;
}

export function find(base: BaseServer, users: Collection<number, PeerDataType>, func: (user: Peer) => boolean) {
  for (const item of users.values()) {
    const peer = users.getSelf(item.netID);
    if (func(peer)) {
      return peer;
    }
  }
  return undefined;
}

export function hashItemsDat(file: Buffer) {
  let hash = 0x55555555;
  file.forEach((x) => (hash = (hash >>> 27) + (hash << 5) + x));
  return hash;
}

export function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, process.env.ENCRYPT_SECRET || "").toString();
}
export function decrypt(data: string): string {
  return CryptoJS.AES.decrypt(data, process.env.ENCRYPT_SECRET || "").toString(CryptoJS.enc.Utf8);
}

export function handleSaveAll(server: BaseServer, dcAll = false) {
  server.log.warn(`Saving ${server.cache.users.size} peers & ${server.cache.worlds.size} worlds.`);

  const saveWorlds = () => {
    if (server.cache.worlds.size === 0) process.exit();
    else {
      let o = 0;
      server.cache.worlds.forEach(async (wrld) => {
        const world = new World(server, wrld.name);
        if (typeof world.worldName === "string") await world.saveToDatabase();
        else server.log.warn(`Oh no there's undefined (${o}) world, skipping..`);

        o += 1;
        if (o === server.cache.worlds.size) process.exit();
      });
    }
  };

  if (server.cache.users.size === 0) process.exit();
  else {
    let i = 0;
    server.cache.users.forEach(async (peer) => {
      const player = server.cache.users.getSelf(peer.netID);
      await player.saveToDatabase();
      if (dcAll) {
        player.disconnect("now");
      } else {
        // send onconsolemessage for auto saving
      }
      i += 1;
      if (i === server.cache.users.size) saveWorlds();
    });
  }
}

// Masih rusak woi
export function manageArray(arr: string[], length: number, newItem: string): string[] {
  // Check if the array needs trimming
  if (arr.length > length) {
    arr.shift(); // Remove the first element
  }

  // Check if the new item already exists
  const existingIndex = arr.indexOf(newItem);
  if (existingIndex !== -1) {
    arr.splice(existingIndex, 1); // Remove existing item
  }

  // Add the new item to the end
  arr.push(newItem);

  return arr;
}

export class Color {
  private colors: Uint8Array = new Uint8Array(4);

  constructor(r: number, g: number, b: number, a: number = 255) {
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255 || a < 0 || a > 255) {
      throw new Error("Invalid color values. Each value must be between 0 and 255.");
    }

    this.colors[0] = b;
    this.colors[1] = g;
    this.colors[2] = r;
    this.colors[3] = a;
  }

  public getUint(): number {
    let result = 0;
    for (let index = 0; index < this.colors.length; index++) {
      result = (result << 8) + this.colors[index];
    }
    return result;
  }

  public setRed(col: number): void {
    this.colors[2] = col;
  }

  public red(): number {
    return this.colors[2];
  }

  public setGreen(col: number): void {
    this.colors[1] = col;
  }

  public green(): number {
    return this.colors[1];
  }

  public setBlue(col: number): void {
    this.colors[0] = col;
  }

  public blue(): number {
    return this.colors[0];
  }

  public setAlpha(col: number): void {
    this.colors[3] = col;
  }

  public alpha(): number {
    return this.colors[3];
  }
}
