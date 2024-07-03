import fs from "node:fs";
import { Client } from "growtopia.js";
import { WebServer } from "./Webserver.js";
import { hashItemsDat } from "../utils/Utils.js";
import { Action } from "../abstracts/Action.js";
import { ItemsDat } from "growtopia.js";
import type { ItemsDatMeta } from "growtopia.js";
import { Logger } from "./Logger.js";
import { Command } from "../abstracts/Command.js";
import type { CooldownOptions, PeerDataType, Ignore, Lock, WorldData, WikiItems } from "../types";
import { Dialog } from "../abstracts/Dialog.js";
import { Database } from "../database/db.js";
import { Collection } from "./Collection.js";
import { ActionTypes } from "../utils/enums/Tiles.js";
import decompress from "decompress";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { WSServer } from "../websockets/server.js";
import { Items } from "./Items.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class BaseServer {
  public server: Client;
  public items;
  public action: Map<string, Action>;
  public cache: {
    users: Collection<number, PeerDataType>;
    worlds: Collection<string, WorldData>;
  };
  public log: Logger;
  public commands: Map<string, Command>;
  public cooldown: Map<string, CooldownOptions>;
  public dialogs: Map<string, Dialog>;
  public database;
  public locks: Lock[];
  public ignore: Ignore;
  public cdn: { version: number; uri: string };
  public wss?: WSServer;

  constructor() {
    this.server = new Client({ https: { enable: false } });
    this.items = {
      hash: `${hashItemsDat(fs.readFileSync("./assets/dat/items.dat"))}`,
      content: fs.readFileSync("./assets/dat/items.dat"),
      wiki: JSON.parse(fs.readFileSync("./assets/items_info.json", "utf-8")) as WikiItems[],
      metadata: {} as ItemsDatMeta
    };
    this.action = new Map();
    this.cache = {
      users: new Collection(this),
      worlds: new Collection(this)
    };
    this.log = new Logger();
    this.commands = new Map();
    this.cooldown = new Map();
    this.dialogs = new Map();
    this.database = new Database();
    this.locks = [
      {
        id: 202, // Small Lock
        maxTiles: 10
      },
      {
        id: 204, // Big Lock
        maxTiles: 48
      },
      {
        id: 206, // Huge Lock
        maxTiles: 200
      },
      {
        id: 4994, // Builder's Lock
        maxTiles: 200
      }
    ];
    this.ignore = {
      blockIDsToIgnoreByLock: [6, 8],
      blockActionTypesToIgnore: [ActionTypes.LOCK, ActionTypes.MAIN_DOOR]
    };
    this.cdn = { version: 0, uri: "" };
  }

  public async start() {
    this.log.info("Please wait extracting cache.zip");
    await decompress("assets/cache.zip", "assets/cache");
    this.log.ready("Successfully extracting cache.zip");

    this.#_loadItems().then(async () => {
      this.log.ready("Items data ready!");
      this.log.info("Fetching latest Growtopia Cache");
      this.cdn = await this.getLatestCdn();

      const web = await WebServer(this);
      this.wss = new WSServer(this, web);
      this.wss.start();

      await this.#_loadEvents();
      await this.#_loadActions();
      await this.#_loadCommands();
      await this.#_loadDialogs();

      this.server.listen();
    });
  }

  async #_loadEvents() {
    await fs.readdirSync(`${__dirname}/../events`).forEach(async (event) => {
      const file = (await import(`../events/${event}`)).default;
      const initFile = new file(this);
      this.server.on(initFile.name, (...args) => initFile.run(...args));
      this.log.event(`Loaded "${initFile.name}" events`);
    });
  }

  async #_loadItems() {
    let itemsDat = new ItemsDat(fs.readFileSync("./assets/dat/items.dat"));
    await itemsDat.decode();

    try {
      itemsDat = await Items.loadCustomItems(itemsDat);
      this.log.info("Loaded custom items");
    } catch (e) {
      this.log.error(e);
    }

    await itemsDat.encode();
    this.items.content = itemsDat.data;
    this.items.hash = `${hashItemsDat(itemsDat.data)}`;
    this.items.metadata = itemsDat.meta;
  }

  async #_loadActions() {
    await fs.readdirSync(`${__dirname}/../actions`).forEach(async (event) => {
      const file = (await import(`../actions/${event}`)).default;
      const initFile = new file(this);
      this.action.set(initFile.config.eventName, initFile);
    });
  }

  async #_loadDialogs() {
    await fs.readdirSync(`${__dirname}/../dialogs`).forEach(async (event) => {
      const file = (await import(`../dialogs/${event}`)).default;
      const initFile = new file(this);
      this.dialogs.set(initFile.config.dialogName, initFile);
    });
  }

  async #_loadCommands() {
    await fs.readdirSync(`${__dirname}/../commands`).forEach(async (fileName) => {
      const file = (await import(`../commands/${fileName}`)).default;
      const initFile = new file(this);
      this.commands.set(initFile.opt.name, initFile);
    });
  }

  async getLatestCdn() {
    try {
      const res = await axios.get("https://mari-project.jad.li/api/v1/growtopia/cache/latest");
      if (res.status !== 200) return { version: 0, uri: "" };

      return res.data as { version: number; uri: string };
    } catch (e) {
      return { version: 0, uri: "" };
    }
  }
}
