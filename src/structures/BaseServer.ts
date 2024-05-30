import fs from "node:fs";
import { Client } from "growtopia.js";
import { WebServer } from "./Webserver";
import { hashItemsDat } from "../utils/Utils";
import { Action } from "../abstracts/Action";
import { ItemsDat } from "growtopia.js";
import { ItemsDatMeta } from "growtopia.js";
import { Logger } from "./Logger";
import { Command } from "../abstracts/Command";
import { CooldownOptions, PeerDataType, Ignore, Lock, WorldData, WikiItems } from "../types";
import { Dialog } from "../abstracts/Dialog";
import { Database } from "../database/db";
import { Collection } from "./Collection";
import { ActionTypes } from "../utils/enums/Tiles";
import decompress from "decompress";

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
  }

  public async start() {
    this.log.info("Please wait extracting cache.zip");
    await decompress("assets/cache.zip", "assets/cache");
    this.log.ready("Successfully extracting cache.zip");

    this.#_loadItems().then(async () => {
      this.log.ready("Items data ready!");
      await WebServer(this);
      await this.#_loadEvents();
      await this.#_loadActions();
      this.log.action(`Loaded ${this.action.size} actions`);
      await this.#_loadCommands();
      this.log.dialog(`Loaded ${this.commands.size} commands`);
      await this.#_loadDialogs();
      this.log.dialog(`Loaded ${this.dialogs.size} dialogs`);

      this.server.listen();
    });
  }

  async #_loadEvents() {
    fs.readdirSync(`${__dirname}/../events`).forEach(async (event) => {
      const file = (await import(`../events/${event}`)).default;
      const initFile = new file(this);
      this.server.on(initFile.name, (...args) => initFile.run(...args));
      this.log.event(`Loaded "${initFile.name}" events`);
    });
  }

  async #_loadItems() {
    const itemsDat = new ItemsDat(fs.readFileSync("./assets/dat/items.dat"));
    await itemsDat.decode();

    const findItem = (id: number) => itemsDat.meta.items.findIndex((v) => v.id === id);

    // id 8900-8902
    itemsDat.meta.items[findItem(8900)].extraFile = { raw: Buffer.from("interface/large/banner.rttex"), value: "interface/large/banner.rttex" };
    itemsDat.meta.items[findItem(8900)].extraFileHash = hashItemsDat(fs.readFileSync("./assets/cache/interface/large/banner.rttex"));
    itemsDat.meta.items[findItem(8902)].extraFile = { raw: Buffer.from("interface/large/banner-transparent.rttex"), value: "interface/large/banner-transparent.rttex" };
    itemsDat.meta.items[findItem(8902)].extraFileHash = hashItemsDat(fs.readFileSync("./assets/cache/interface/large/banner-transparent.rttex"));

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
}
