import { Client, ItemsDat, ItemsDatMeta } from "growtopia.js";
import { Web } from "./Web.js";
import { downloadMkcert, hashItemsDat, setupMkcert } from "../utils/Utils.js";
import { join } from "path";
import { ConnectListener } from "../events/Connect.js";
import { type PackageJson } from "type-fest";
import { DisconnectListener } from "../events/Disconnect.js";
import { RawListener } from "../events/Raw";
import consola from "consola";
import fs from "fs";
import { Cache, CDNContent } from "../types";
import { Collection } from "../utils/Collection.js";
import { Database } from "../database/Database.js";

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
      metadata: {} as ItemsDatMeta
    };
    this.package = JSON.parse(fs.readFileSync(join(__dirname, "package.json"), "utf-8"));
    this.config = JSON.parse(fs.readFileSync(join(__dirname, "config.json"), "utf-8"));
    this.cdn = { version: "", uri: "0000/0000" };
    this.cache = {
      peers: new Collection(),
      worlds: new Collection()
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
    this.server.on("raw", (netID, data) => raw.run(netID, data));
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
  }
}
