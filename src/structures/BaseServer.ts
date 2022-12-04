import fs from "node:fs";
import { Server, TextPacket, TankPacket, DefaultCache } from "growsockets";
import { WebServer } from "./Webserver";
import { hashItemsDat } from "../utils/Utils";
import { Action } from "../abstracts/Action";
import { ItemsDat } from "itemsdat";
import { World } from "./World";
import { Peer } from "./Peer";
import { Logger } from "./Logger";

export class BaseServer {
  public server: Server<unknown, unknown, unknown>;
  public items;
  public action: Map<string, Action>;
  public cache: {
    users: Map<number, Peer>;
    worlds: Map<string, World>;
  };
  public log: Logger;

  constructor() {
    this.server = new Server({ http: { enabled: false } });
    this.items = {
      hash: `${hashItemsDat(fs.readFileSync("./assets/dat/items.dat"))}`,
      content: fs.readFileSync("./assets/dat/items.dat"),
      metadata: new ItemsDat(fs.readFileSync("./assets/dat/items.dat")).decode()
    };
    this.action = new Map();
    this.cache = {
      users: new Map(),
      worlds: new Map()
    };
    this.log = new Logger();
  }

  public start() {
    this.#_loadEvents();
    this.#_loadActions();
    this.server.listen();
    WebServer(this.log);
  }

  #_loadEvents() {
    fs.readdirSync(`${__dirname}/../events`).forEach(async (event) => {
      let file = (await import(`../events/${event}`)).default;
      let initFile = new file();
      this.server.on(initFile.name, (...args) => initFile.run(this, ...args));
      this.log.event(`Loaded "${initFile.name}" events`);
    });
  }

  #_loadActions() {
    fs.readdirSync(`${__dirname}/../actions`).forEach(async (event) => {
      let file = (await import(`../actions/${event}`)).default;
      let initFile = new file();
      this.action.set(initFile.config.eventName, initFile);
      this.log.action(`Loaded "${initFile.config.eventName}" actions`);
    });
  }
}
