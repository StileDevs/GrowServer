import express from "express";
import { readFileSync, existsSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { BaseServer } from "./BaseServer.js";
import { ApiRouter } from "../routes/index.js";
import { fileURLToPath } from "url";
import { WSServer } from "../websockets/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const options = {
  key: readFileSync("./assets/ssl/server.key"),
  cert: readFileSync("./assets/ssl/server.crt")
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
  app.use("/public", express.static(path.join(__dirname, "../../../website/public")));

  if (existsSync("./assets/cache/cache")) {
    app.use("/growtopia/cache", express.static(path.join(__dirname, "../../../assets/cache/cache")));
  } else {
    app.use("/growtopia/cache", express.static(path.join(__dirname, "../../../assets/cache")));
  }

  app.use("/", express.static(path.join(__dirname, "..", "..", "build")));

  app.use("/api", ApiRouter(server));
  app.use("/growtopia/server_data.php", (req, res) => {
    res.send(`server|${process.env.WEB_ADDRESS}\nport|17091\ntype|1\n#maint|Maintenance woi\nmeta|lolwhat\nRTENDMARKERBS1001`);
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

  if (process.env.WEB_ENV === "production") {
    await new WSServer(
      server,
      app.listen(3000, () => {
        server.log.ready(`Starting development web server on: http://${process.env.WEB_ADDRESS}:3000`);
        server.log.info(`To register account you need to register at: http://${process.env.WEB_ADDRESS}:3000/register`);
      })
    ).start();
  } else if (process.env.WEB_ENV === "development") {
    const httpServer = http.createServer(app);
    const httpsServer = https.createServer(options, app);

    httpServer.listen(80);
    httpsServer.listen(443);

    httpsServer.on("listening", () => {
      server.log.ready(`Starting web server on: http://${process.env.WEB_ADDRESS}:80`);
    });
    await new WSServer(server, httpServer).start();
  }
}
