// src/plugin.js
import { TextPacket, Peer, Client } from "growtopia.js";
import { readFileSync } from "fs";
var PluginPackage = JSON.parse(readFileSync("./package.json", "utf-8"));
var Plugin = class {
  constructor() {
    this.client = void 0;
  }
  /**
   * Initialize plugin
   * @param {Client} client
   */
  init(client) {
    this.pluginConf = PluginPackage;
    this.client = client;
    console.log(`Loaded ${this.pluginConf.name} v${this.pluginConf.version}`);
  }
  /**
   * Emitted when client successfully connected to ENet server.
   * Peer state will change into CONNECTED state.
   * @param {number} netID
   */
  onConnect(netID) {
    console.log("Client connected", this.client.cache);
    const peer = new Peer(this.client, netID);
    peer.send(TextPacket.from(1));
  }
  /**
   * Emitted when client disconnected from the ENet server.
   * Peer state will changed, depends what type of disconnected was used.
   * @param {number} netID
   */
  onDisconnect(netID) {
    console.log("Client disconnected", this.client.cache);
  }
  /**
   * Emitted when client sending a bunch of buffer data.
   * @param {number} netID
   * @param {Buffer} data
   */
  onRaw(netID, data) {
    console.log(`Received raw data from netID: ${netID}`, data);
  }
};
export {
  Plugin
};
