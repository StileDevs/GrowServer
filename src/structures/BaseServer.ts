import fs from "node:fs";
import { Server, TextPacket, TankPacket, DefaultCache } from "growsockets";
import { WebServer } from "./Webserver";
import { hashItemsDat } from "../utils/Utils";
import { Action } from "../abstracts/Action";
import { ItemsDat } from "itemsdat";
import { ItemsDatMeta } from "itemsdat/src/Types";
import { World } from "./World";
import { Peer } from "./Peer";
import { Logger } from "./Logger";
import { Command } from "../abstracts/Command";
import { CooldownOptions } from "../types/command";
import { Dialog } from "../abstracts/Dialog";

export class BaseServer {
  public server: Server<unknown, unknown, unknown>;
  public items;
  public action: Map<string, Action>;
  public cache: {
    users: Map<number, Peer>;
    worlds: Map<string, World>;
  };
  public log: Logger;
  public commands: Map<string, Command>;
  public cooldown: Map<string, CooldownOptions>;
  public dialogs: Map<string, Dialog>;

  constructor() {
    this.server = new Server({ http: { enabled: false }, log: false });
    this.items = {
      hash: `${hashItemsDat(fs.readFileSync("./assets/dat/items.dat"))}`,
      content: fs.readFileSync("./assets/dat/items.dat"),
      metadata: {} as ItemsDatMeta
    };
    this.action = new Map();
    this.cache = {
      users: new Map(),
      worlds: new Map()
    };
    this.log = new Logger();
    this.commands = new Map();
    this.cooldown = new Map();
    this.dialogs = new Map();
  }

  public start() {
    this.#_loadItems().then(() => {
      this.log.ready("Items data ready!");
      this.#_loadEvents();
      this.#_loadActions();
      this.#_loadCommands();
      this.#_loadDialogs();
      this.server.listen();
      WebServer(this.log);
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
