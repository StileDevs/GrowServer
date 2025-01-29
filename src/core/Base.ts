import { Client, ItemsDat, ItemsDatMeta } from "growtopia.js";
import { Web } from "./Web";
import {
  downloadMkcert,
  hashItemsDat,
  setupMkcert,
  checkPortInUse,
  downloadWebsite,
  setupWebsite
} from "../utils/Utils";
import { join } from "path";
import { ConnectListener } from "../events/Connect";
import { DisconnectListener } from "../events/Disconnect";
import { type PackageJson } from "type-fest";
import { RawListener } from "../events/Raw";
import consola from "consola";
import { readFileSync } from "fs";
import { Cache, CDNContent, CustomItemsConfig, ItemsInfo } from "../types";
import { Collection } from "../utils/Collection";
import { Database } from "../database/Database";
import { Peer } from "./Peer";
import { World } from "./World";
import { request } from "undici";
import { RTTEX } from "../utils/RTTEX";
import { mkdir, writeFile, readFile } from "fs/promises";
import chokidar from "chokidar";
__dirname = process.cwd();

export class Base {
  public server: Client;
  public items;
  public package: PackageJson;
  public config: typeof import('../../config.json');
  public cdn: CDNContent;
  public cache: Cache;
  public database: Database;

  constructor() {
    this.server = new Client({
      enet: {
        ip: "0.0.0.0",
      }
    });
    this.items = {
      hash:     `${hashItemsDat(readFileSync(join(__dirname, "assets", "dat", "items.dat")))}`,
      content:  readFileSync(join(__dirname, "assets", "dat", "items.dat")),
      // wiki: JSON.parse(fs.readFileSync("./assets/items_info.json", "utf-8")) as WikiItems[],
      metadata: {} as ItemsDatMeta,
      wiki:     [] as ItemsInfo[]
    };
    this.package = JSON.parse(
      readFileSync(join(__dirname, "package.json"), "utf-8")
    );
    this.config = JSON.parse(
      readFileSync(join(__dirname, "config.json"), "utf-8")
    );
    this.cdn = { version: "", uri: "0000/0000" };
    this.cache = {
      peers:    new Collection(),
      worlds:   new Collection(),
      cooldown: new Collection()
    };

    this.database = new Database();
    consola.level = 4;
  }

  public async start() {
    try {
      consola.box(
        `GrowServer\nVersion: ${this.package.version}\n© JadlionHD 2022-${new Date().getFullYear()}`
      );

      // Check if port is available
      const port = this.server.config.enet?.port || 17091;
      const portInUse = await checkPortInUse(port);

      if (portInUse) {
        throw new Error(
          `Port ${port} is already in use. Please choose a different port.`
        );
      }

      await downloadMkcert();
      await setupMkcert();

      await downloadWebsite();
      await setupWebsite();
      this.cdn = await this.getLatestCdn();
      await Web(this);

      consola.log(`🔔Starting ENet server on port ${port}`);

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
    this.server.on("raw", (netID, channelID, data) =>
      raw.run(netID, channelID, data)
    );

    // Check items-config.json file changes
    chokidar
      .watch(join(__dirname, "assets", "custom-items"), { persistent: true })
      .on("change", async (path) => {
        const pathArr = path.split("\\");
        const fileName = pathArr[pathArr.length - 1];

        consola.info(`Detected custom-items directory changes | ${fileName}`);
        consola.info(`Refreshing items data`);
        await this.loadItems();
      });
  }

  private async loadItems() {
    const itemsDat = new ItemsDat(
      await readFile(join(__dirname, "assets", "dat", "items.dat"))
    );
    await itemsDat.decode();
    consola.start("Loading custom items...");

    try {
      const itemsConf = JSON.parse(
        await readFile(
          join(__dirname, "assets", "custom-items", "items-config.json"),
          "utf-8"
        )
      ) as CustomItemsConfig;

      for (const asset of itemsConf.assets) {
        if (!asset.id) throw "Item ID are required to replace specific item";

        const item = itemsDat.meta.items[asset.id];

        consola.start(`Modifying item ID: ${item.id} | ${item.name}`);

        Object.assign(item, {
          ...asset.item
        });

        if (asset.item.extraFile) {
          const image = await readFile(
            join(
              __dirname,
              "assets",
              "custom-items",
              asset.item.extraFile.pathAsset
            )
          );
          const rttex = await RTTEX.encode(image);

          item.extraFile = asset.item.extraFile.pathResult;
          item.extraFileHash = hashItemsDat(rttex);

          await mkdir(
            join(__dirname, ".cache", "growtopia", "cache", asset.storePath),
            {
              recursive: true
            }
          );
          await writeFile(
            join(
              __dirname,
              ".cache",
              "growtopia",
              "cache",
              asset.storePath,
              asset.item.extraFile.fileName
            ),
            rttex,
            {
              flush: true
            }
          );
        }

        if (asset.item.texture) {
          const image = await readFile(
            join(
              __dirname,
              "assets",
              "custom-items",
              asset.item.texture.pathAsset
            )
          );
          const rttex = await RTTEX.encode(image);

          item.texture = asset.item.texture.pathResult;
          item.textureHash = hashItemsDat(rttex);

          await mkdir(
            join(__dirname, ".cache", "growtopia", "cache", asset.storePath),
            {
              recursive: true
            }
          );
          await writeFile(
            join(
              __dirname,
              ".cache",
              "growtopia",
              "cache",
              asset.storePath,
              asset.item.texture.fileName
            ),
            rttex,
            {
              flush: true
            }
          );
        }

        consola.success(
          `Successfully modifying item ID: ${item.id} | ${item.name}`
        );
      }
    } catch (e) {
      consola.error("Failed to load custom items: " + e);
    }

    await itemsDat.encode();
    const hash = hashItemsDat(itemsDat.data);
    this.items.content = itemsDat.data;
    this.items.hash = `${hash}`;
    this.items.metadata = itemsDat.meta;
    this.items.wiki = JSON.parse(
      await readFile(join(__dirname, "assets", "items_info_new.json"), "utf-8")
    ) as ItemsInfo[];

    consola.info(`Items data hash: ${hash}`);
    consola.success("Successfully parsing items data");
  }

  public async getLatestCdn() {
    try {
      const res = await request(
        "https://mari-project.jad.li/api/v1/growtopia/cache/latest",
        {
          method: "GET"
        }
      );

      if (res.statusCode !== 200) return { version: "", uri: "" };

      const data = await res.body.json();
      return data as CDNContent;
    } catch (e) {
      consola.error(`Failed to get latest CDN: ${e}`);
      return { version: "", uri: "" };
    }
  }

  public async saveAll(disconnectAll = false): Promise<boolean> {
    consola.info(
      `Saving ${this.cache.peers.size} peers & ${this.cache.worlds.size} worlds`
    );

    const worldsSaved = await this.saveWorlds();
    const playersSaved = await this.savePlayers(disconnectAll);

    return worldsSaved && playersSaved;
  }

  public async saveWorlds() {
    try {
      let savedCount = 0;
      for (const [, world] of this.cache.worlds) {
        const wrld = new World(this, world.name);
        if (typeof wrld.worldName === "string")
          await wrld.saveToDatabase().catch((e) => consola.error(e));
        else
          consola.warn(
            `Oh no there's undefined (${savedCount}) world, skipping..`
          );
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
      for (const [, peer] of this.cache.peers) {
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
