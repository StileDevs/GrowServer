import { BaseServer } from "./structures/BaseServer";
import fs from "node:fs";
import { handleSaveAll } from "./utils/Utils";

if (!fs.existsSync("./assets"))
  throw new Error("Could not find 'assets' folder, please create new one.");

if (!fs.existsSync("./assets/ssl"))
  throw new Error("SSL certificate are required for https web server.");

if (!fs.existsSync("./assets/ssl/server.crt"))
  throw new Error("'assets/ssl/server.crt' are required for https web server.");

if (!fs.existsSync("./assets/ssl/server.key"))
  throw new Error("assets/ssl/server.key are required for https web server.");

if (!fs.existsSync("./assets/dat/items.dat"))
  throw new Error("items.dat not exist on 'assets/dat/items.dat'");

const server = new BaseServer();

server.start();

process.on("SIGINT", () => handleSaveAll(server, true));
process.on("SIGQUIT", () => handleSaveAll(server, true));
process.on("SIGTERM", () => handleSaveAll(server, true));
