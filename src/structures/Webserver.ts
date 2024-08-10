import express from "express";
import { readFileSync, existsSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { BaseServer } from "./BaseServer.js";
import { ApiRouter } from "../routes/index.js";
import { fileURLToPath } from "url";
import { PlayerRouter } from "../routes/player/index.js";
import { Config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const options = {
  key: readFileSync("./assets/ssl/server.key"),
  cert: readFileSync("./assets/ssl/server.crt")
};
const options2 = {
  key: readFileSync("./assets/ssl/_wildcard.growserver.app-key.pem"),
  cert: readFileSync("./assets/ssl/_wildcard.growserver.app.pem")
};

const apiLimiter = rateLimit({
  windowMs: 10800000, // 3 hour
  max: 5, // Limit each IP to 5 requests per `window`
  message: "Too many accounts created from this IP, please try again after 3 hour",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

export async function WebServer(server: BaseServer) {
  if (!existsSync("./assets/cache.zip")) throw new Error("Could not find 'cache.zip' file, please get one from growtopia 'cache' folder & compress the 'cache' folder into zip file.");

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use("/public", express.static(path.join(__dirname, "../../website/public")));

  if (existsSync("./assets/cache/cache")) {
    app.use("/growtopia/cache", express.static(path.join(__dirname, "../../assets/cache/cache")));
  } else {
    app.use("/growtopia/cache", express.static(path.join(__dirname, "../../assets/cache")));
  }

  app.use("/", express.static(path.join(__dirname, "..", "..", "build")));

  app.use("/api", ApiRouter(server));

  // New Login Sytem
  app.use("/player", PlayerRouter(server));

  app.use("/growtopia/server_data.php", (req, res) => {
    let str = "";
    const conf = server.config.webserver;

    if (server.cdn.version === req.body.version || Config.bypassVersionCheck) str += `server|${conf.address}\n`;
    else {
      str += `error|1000|Update is now available for your device.  Go get it!  You'll need to install it before you can play online.\nurl|${req.body.platform === "0" ? "https://growtopiagame.com/Growtopia-Installer.exe" : "market://details?id=com.rtsoft.growtopia"}\n`;
    }
    const randPort = conf.ports[Math.floor(Math.random() * conf.ports.length)];
    str += `port|${randPort}\nloginurl|${conf.loginUrl}\ntype|1\n${conf.maintenance.enable ? "maint" : "#maint"}|${conf.maintenance.message}\nmeta|ignoremeta\nRTENDMARKERBS1001`;
    res.send(str);
  });
  app.use("/growtopia/cache*", (req, res, next) => {
    server.log.warn(`Growtopia Client requesting cache: ${req.originalUrl} not found. Redirecting to Growtopia Original CDN...`);
    const url = `https://ubistatic-a.akamaihd.net/${server.cdn.uri}/${req.originalUrl.replace("/growtopia/", "")}`;
    res.redirect(url);
    next();
  });

  app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "build"));
  });

  if (!server.config.webserver.development) {
    return app.listen(3000, () => {
      server.log.ready(`Starting production web server on: http://${server.config.webserver.address}:3000`);
    });
  } else {
    const httpServer = http.createServer(app);
    const httpsServer = https.createServer(options, app);
    const httpsServerLogin = https.createServer(options2, app);

    httpServer.listen(80);
    httpsServer.listen(443);
    httpsServerLogin.listen(8080);

    httpsServer.on("listening", () => {
      server.log.ready(`Starting web server on: http://${server.config.webserver.address}:80`);
    });
    httpsServerLogin.on("listening", () => {
      server.log.ready(`Starting login server on: https://${server.config.webserver.loginUrl}`);
    });
    return httpServer;
  }
}
