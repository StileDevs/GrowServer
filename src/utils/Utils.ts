import CryptoJS from "crypto-js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
interface DataObject {
  [key: string]: string | number;
}

export function parseAction(chunk: Buffer): DataObject | undefined {
  let data: DataObject = {};
  chunk[chunk.length - 1] = 0;

  let str = chunk.toString("utf-8", 4);
  const lines = str.split("\n");

  lines.forEach((line) => {
    if (line.startsWith("|")) line = line.slice(1);
    const info = line.split("|");

    let key = info[0];
    let val = info[1];

    if (key && val) {
      if (val.endsWith("\x00")) val = val.slice(0, -1);
      data[key] = val;
    }
  });

  return data;
}

export function find(users: Map<number, Peer>, func: (user: Peer) => boolean) {
  for (const item of users.values()) {
    if (func(item)) {
      return item;
    }
  }
  return undefined;
}

export function hashItemsDat(file: Buffer) {
  let hash = 0x55555555;
  file.forEach((x) => (hash = (hash >>> 27) + (hash << 5) + x));
  return hash >>> 0;
}

export function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, process.env.ENCRYPT_SECRET!).toString();
}
export function decrypt(data: string): string {
  return CryptoJS.AES.decrypt(data, process.env.ENCRYPT_SECRET!).toString(CryptoJS.enc.Utf8);
}

export function handleSaveAll(server: BaseServer, dcAll = false) {
  server.log.warn(`Saving ${server.cache.users.size} peers & ${server.cache.worlds.size} worlds.`);

  const saveWorlds = () => {
    if (server.cache.worlds.size === 0) process.exit();
    else {
      let o = 0;
      server.cache.worlds.forEach(async (world) => {
        await world.saveToDatabase();

        o += 1;
        if (o === server.cache.worlds.size) process.exit();
      });
    }
  };

  if (server.cache.users.size === 0) process.exit();
  else {
    let i = 0;
    server.cache.users.forEach(async (player) => {
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
