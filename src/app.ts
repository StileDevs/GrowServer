import { BaseServer } from "./structures/BaseServer";
import fs from "node:fs";
import { handleSaveAll } from "./utils/Utils";
import { DiscordManager } from "./structures/DiscordManager";

if (!fs.existsSync("./assets")) throw new Error("Could not find 'assets' folder, please create new one.");

if (!fs.existsSync("./assets/ssl")) throw new Error("SSL certificate are required for https web server.");

if (!fs.existsSync("./assets/ssl/server.crt")) throw new Error("'assets/ssl/server.crt' are required for https web server.");

if (!fs.existsSync("./assets/ssl/server.key")) throw new Error("assets/ssl/server.key are required for https web server.");

if (!fs.existsSync("./assets/dat/items.dat")) throw new Error("items.dat not exist on 'assets/dat/items.dat'");

const server = new BaseServer();

server.start();

const token = process.env.TOKEN;
const clientId = process.env.CLIENTID;

if (!token) throw new Error('Token is not defined');
if (!clientId) throw new Error('ClientID is not defined');

const Manager = new DiscordManager(token, clientId, server);
Manager.start();

process.on("SIGINT", () => handleSaveAll(server, true));
process.on("SIGQUIT", () => handleSaveAll(server, true));
process.on("SIGTERM", () => handleSaveAll(server, true));
