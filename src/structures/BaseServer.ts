import fs from "node:fs";
import { TextPacket, TankPacket, Client } from "growtopia.js";
import { WebServer } from "./Webserver";
import { hashItemsDat } from "../utils/Utils";
import { Action } from "../abstracts/Action";
import { ItemsDat } from "growtopia.js";
import { ItemsDatMeta } from "growtopia.js";
import { World } from "./World";
import { Peer } from "./Peer";
import { Logger } from "./Logger";
import { Command } from "../abstracts/Command";
import { CooldownOptions } from "../types/command";
import { Dialog } from "../abstracts/Dialog";
import { Database } from "../database/db";
import { Collection } from "./Collection";
import { PeerDataType } from "../types/peer";
import { WorldData } from "../types/world";

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

  constructor() {
    this.server = new Client({ https: { enable: false } });
    this.items = {
      hash: `${hashItemsDat(fs.readFileSync("./assets/dat/items.dat"))}`,
      content: fs.readFileSync("./assets/dat/items.dat"),
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
  }

  public start() {
    this.#_loadItems().then(() => {
      this.log.ready("Items data ready!");
      this.#_loadEvents();
      this.#_loadActions();
      this.#_loadCommands();
      this.#_loadDialogs();
      this.server.listen();
      WebServer(this.log, this.database);
    });
  }

  #_loadEvents() {
    fs.readdirSync(`${__dirname}/../events`).forEach(async (event) => {
      let file = (await import(`../events/${event}`)).default;
      let initFile = new file();
      this.server.on(initFile.name, (...args) => initFile.run(this, ...args));
      this.log.event(`Loaded "${initFile.name}" events`);
    });
  }

  async #_loadItems() {
    let items = await new ItemsDat(fs.readFileSync("./assets/dat/items.dat")).decode();

    // 1181890091
    // let tes = items.items.find((v) => v.id === 10000)!;
    // console.log(tes);
    // tes.extraFile = "interface/large/news_banner1.rttex";
    // tes.extraFileHash = 1181890091;
    // console.log(tes);

    // const encoded = await new ItemsDat().encode(items);
    // let newItems = await new ItemsDat(encoded).decode();

    // this.items.content = encoded;
    // this.items.hash = `${hashItemsDat(encoded)}`;
    // this.items.metadata = newItems;
    this.items.metadata = items;
  }

  #_loadActions() {
    fs.readdirSync(`${__dirname}/../actions`).forEach(async (event) => {
      let file = (await import(`../actions/${event}`)).default;
      let initFile = new file();
      this.action.set(initFile.config.eventName, initFile);
      this.log.action(`Loaded "${initFile.config.eventName}" actions`);
    });
  }

  #_loadDialogs() {
    fs.readdirSync(`${__dirname}/../dialogs`).forEach(async (event) => {
      let file = (await import(`../dialogs/${event}`)).default;
      let initFile = new file();
      this.dialogs.set(initFile.config.dialogName, initFile);
      this.log.dialog(`Loaded "${initFile.config.dialogName}" dialogs`);
    });
  }

  #_loadCommands() {
    fs.readdirSync(`${__dirname}/../commands`).forEach(async (fileName) => {
      let file = (await import(`../commands/${fileName}`)).default;
      let initFile = new file();
      this.commands.set(initFile.opt.name, initFile);
      this.log.command(`Loaded "${initFile.opt.name}" command`);
    });
  }
}
