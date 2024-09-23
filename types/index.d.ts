import { Client } from "growtopia.js";

class Plugin {
  client?: Client;
  constructor();
  init(client: Client): void;
  onConnect(netID: number): void;
  onDisconnect(netID: number): void;
  onRaw(netID: number, data: Buffer): void;
}
export { Plugin };
