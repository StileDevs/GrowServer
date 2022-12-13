import CryptoJS from "crypto-js";
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
