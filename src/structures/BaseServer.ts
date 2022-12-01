import fs from "node:fs";
import { Server, Peer, TextPacket, TankPacket, DefaultCache } from "growsockets";
import { WebServer } from "./Webserver";
import { hashItemsDat } from "../utils/Utils";
import { Action } from "../abstracts/Action";
import { ItemsDat } from "itemsdat";
import { World } from "./World";
import { User } from "../types/user";

export class BaseServer {
  public server: Server<unknown, unknown, unknown>;
  public items;
  public action: Map<string, Action>;
  public cache: {
    users: Map<number, Peer<User>>;
    worlds: Map<string, World>;
  };

  constructor() {
    this.server = new Server({ http: { enabled: false }, cache: new DefaultCache() });
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
  }

  public start() {
    this.#_loadEvents();
    this.#_loadActions();
    this.server.listen();
    WebServer();
  }

  #_loadEvents() {
    fs.readdirSync(`${__dirname}/../events`).forEach(async (event) => {
      let file = (await import(`../events/${event}`)).default;
      let initFile = new file();
      this.server.on(initFile.name, (...args) => initFile.run(this, ...args));
      console.log(`Loaded "${initFile.name}" events`);
    });
  }

  #_loadActions() {
    fs.readdirSync(`${__dirname}/../actions`).forEach(async (event) => {
      let file = (await import(`../actions/${event}`)).default;
      let initFile = new file();
      this.action.set(initFile.config.eventName, initFile);
      console.log(`Loaded "${initFile.config.eventName}" actions`);
    });
  }

  public saveUser(netID: number, peerData: Peer<User>) {
    this.cache.users.set(netID, peerData);
  }
  public getUser(netId: number, peerData: Peer<User>) {}
}
