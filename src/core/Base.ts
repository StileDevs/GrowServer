import { Client, ItemsDat, ItemsDatMeta, Variant } from "growtopia.js";
import { Web } from "./Web";
import { downloadMkcert, hashItemsDat, setupMkcert, checkPortInUse, downloadWebsite, setupWebsite } from "../utils/Utils";
import { join } from "path";
import { ConnectListener } from "../events/Connect";
import { DisconnectListener } from "../events/Disconnect";
import { type PackageJson } from "type-fest";
import { RawListener } from "../events/Raw";
import consola from "consola";
import fs from "fs";
import { Cache, CDNContent, ItemsInfo } from "../types";
import { Collection } from "../utils/Collection";
import { Database } from "../database/Database";
import { Peer } from "./Peer";
import { World } from "./World";
import { TextPacket } from "growtopia.js";
import { PacketTypes } from "../Constants";
__dirname = process.cwd();

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
    try {
      consola.box(`GrowServer\nVersion: ${this.package.version}\n© JadlionHD 2022-${new Date().getFullYear()}`);

      // Check if port is available
      const port = this.server.config.enet?.port || 17091;
      const portInUse = await checkPortInUse(port);

      if (portInUse) {
        throw new Error(`Port ${port} is already in use. Please choose a different port.`);
      }

      await downloadMkcert();
      await setupMkcert();

      await downloadWebsite();
      await setupWebsite();
      await Web(this);

      consola.log(`🔔 Starting ENet server on port ${port}`);

      // Add error handling for server start
      await new Promise((resolve, reject) => {
        try {
          this.server.listen();
          resolve(true);
        } catch (err) {
          reject(err);
        }
      });

      await this.loadItems();
      await this.loadEvents();
    } catch (err) {
      consola.error(`Failed to start server: ${err}`);
      process.exit(1);
    }
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

  public async saveAll(disconnectAll = false): Promise<boolean> {
    consola.info(`Saving ${this.cache.peers.size} peers & ${this.cache.worlds.size} worlds`);

    const worldsSaved = await this.saveWorlds();
    const playersSaved = await this.savePlayers(disconnectAll);

    return worldsSaved && playersSaved;
  }

  public async saveWorlds() {
    try {
      let savedCount = 0;
      for (const [name, world] of this.cache.worlds) {
        const wrld = new World(this, world.name);
        if (typeof wrld.worldName === "string") await wrld.saveToDatabase().catch((e) => consola.error(e));
        else consola.warn(`Oh no there's undefined (${savedCount}) world, skipping..`);
        savedCount++;
      }
      consola.success(`Saved ${savedCount} worlds`);
      return true;
    } catch (err) {
      consola.error(`Failed to save worlds: ${err}`);
      return false;
    }
  }

  public async savePlayers(disconenctAll: boolean) {
    try {
      let savedCount = 0;
      for (const [_, peer] of this.cache.peers) {
        const player = new Peer(this, peer.netID);
        await player.saveToDatabase();
        if (disconenctAll) {
          player.disconnect("now");
        }
        savedCount++;
      }
      consola.success(`Saved ${savedCount} players`);
      return true;
    } catch (err) {
      consola.error(`Failed to save players: ${err}`);
      return false;
    }
  }

  public async shutdown() {
    consola.info("Shutting down server...");
    await this.saveAll(true);
    process.exit(0);
  }
}
