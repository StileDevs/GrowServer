import { Client, ItemsDat, ItemsDatMeta } from "growtopia.js";
import { Web } from "./Web";
import { downloadMkcert, hashItemsDat, setupMkcert } from "../utils/Utils";
import { join } from "path";
import { ConnectListener } from "../events/Connect";
import { type PackageJson } from "type-fest";
import { DisconnectListener } from "../events/Disconnect";
import { RawListener } from "../events/Raw";
import consola from "consola";
import fs from "fs";
import { Cache, CDNContent, ItemsInfo } from "../types";
import { Collection } from "../utils/Collection";
import { Database } from "../database/Database";
import { Peer } from "./Peer";
import { World } from "./World";

const __dirname = process.cwd();

export class Base {
  public server: Client;
  public items;
  public package: PackageJson;
  public config: Record<string, any>;
  public cdn: CDNContent;
  public cache: Cache;
  public database: Database;

  constructor() {
    this.server = new Client({
      enet: {
        ip: "0.0.0.0"
      }
    });
    this.items = {
      hash: `${hashItemsDat(fs.readFileSync(join(__dirname, "assets", "dat", "items.dat")))}`,
      content: fs.readFileSync(join(__dirname, "assets", "dat", "items.dat")),
      // wiki: JSON.parse(fs.readFileSync("./assets/items_info.json", "utf-8")) as WikiItems[],
      metadata: {} as ItemsDatMeta,
      wiki: [] as ItemsInfo[]
    };
    this.package = JSON.parse(fs.readFileSync(join(__dirname, "package.json"), "utf-8"));
    this.config = JSON.parse(fs.readFileSync(join(__dirname, "config.json"), "utf-8"));
    this.cdn = { version: "", uri: "0000/0000" };
    this.cache = {
      peers: new Collection(),
      worlds: new Collection(),
      cooldown: new Collection()
    };

    this.database = new Database();
    consola.level = 4;
  }

  public async start() {
    consola.box(`GrowServer\nVersion: ${this.package.version}\n© JadlionHD 2022-${new Date().getFullYear()}`);
    await downloadMkcert();
    await setupMkcert();
    await Web();

    consola.log(`🔔 Starting ENet server ${this.server.config.enet?.port}`);
    this.server.listen();
    await this.loadItems();
    await this.loadEvents();
  }

  private async loadEvents() {
    const connect = new ConnectListener(this);
    const disconnect = new DisconnectListener(this);
    const raw = new RawListener(this);

    this.server.on("connect", (netID) => connect.run(netID));
    this.server.on("disconnect", (netID) => disconnect.run(netID));
    this.server.on("raw", (netID, channelID, data) => raw.run(netID, channelID, data));
  }

  private async loadItems() {
    let itemsDat = new ItemsDat(fs.readFileSync(join(__dirname, "assets", "dat", "items.dat")));
    await itemsDat.decode();

    // try {
    //   itemsDat = await Items.loadCustomItems(itemsDat);
    //   this.log.info("Loaded custom items");
    // } catch (e) {
    //   this.log.error(e);
    // }

    await itemsDat.encode();
    this.items.content = itemsDat.data;
    this.items.hash = `${hashItemsDat(itemsDat.data)}`;
    this.items.metadata = itemsDat.meta;
    this.items.wiki = JSON.parse(fs.readFileSync(join(__dirname, "assets", "items_info_new.json"), "utf-8")) as ItemsInfo[];
  }

  public async saveAll(disconnectAll = false) {
    consola.info(`Saving ${this.cache.peers.size} peers & ${this.cache.worlds.size} worlds`);

    this.saveWorlds();
    this.savePlayers(disconnectAll);
  }

  public async saveWorlds() {
    if (this.cache.worlds.size === 0) process.exit();
    else {
      let o = 0;
      this.cache.worlds.forEach(async (wrld) => {
        const world = new World(this, wrld.name);
        if (typeof world.worldName === "string") await world.saveToDatabase();
        else consola.warn(`Oh no there's undefined (${o}) world, skipping..`);

        o += 1;
        if (o === this.cache.worlds.size) process.exit();
      });
    }
  }

  public async savePlayers(disconenctAll: boolean) {
    if (this.cache.peers.size === 0) process.exit();
    else {
      let i = 0;
      this.cache.peers.forEach(async (p) => {
        const player = new Peer(this, p.netID);
        await player.saveToDatabase();
        if (disconenctAll) {
          player.disconnect("now");
        } else {
          // send onconsolemessage for auto saving
        }
        i += 1;
        if (i === this.cache.peers.size) this.saveWorlds();
      });
    }
  }
}
