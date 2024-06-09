import express from "express";
import { readFileSync, existsSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { BaseServer } from "./BaseServer";
import axios from "axios";
import { ApiRouter } from "../routes";

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

export async function getLatestCdn() {
  try {
    const res = await axios.get("https://mari-project.jad.li/api/v1/growtopia/cache/latest");
    if (res.status !== 200) return { version: 0, uri: "" };

    return res.data as { version: number; uri: string };
  } catch (e) {
    return { version: 0, uri: "" };
  }
}

export async function WebServer(server: BaseServer) {
  if (!existsSync("./assets/cache.zip")) throw new Error("Could not find 'cache.zip' file, please get one from growtopia 'cache' folder & compress the 'cache' folder into zip file.");

  server.log.info("Fetching latest Growtopia Cache");
  const cdn = await getLatestCdn();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use("/public", express.static(path.join(__dirname, "../../../website/public")));

  if (existsSync("./assets/cache/cache")) {
    app.use("/growtopia/cache", express.static(path.join(__dirname, "../../../assets/cache/cache")));
  } else {
    app.use("/growtopia/cache", express.static(path.join(__dirname, "../../../assets/cache")));
  }

  app.use("/", express.static(path.join(__dirname, "..", "..", "..", "website", "build")));

  app.use("/api", ApiRouter(server));
  app.use("/growtopia/server_data.php", (req, res) => {
    res.send(`server|${process.env.WEB_ADDRESS}\nport|17091\ntype|1\n#maint|Maintenance woi\nmeta|lolwhat\nRTENDMARKERBS1001`);
  });

  app.use("/growtopia/cache*", (req, res, next) => {
    server.log.warn(`Growtopia Client requesting cache: ${req.originalUrl} not found. Redirecting to Growtopia Original CDN...`);
    const url = `https://ubistatic-a.akamaihd.net/${cdn.uri}/${req.originalUrl.replace("/growtopia/", "")}`;
    res.redirect(url);
    next();
  });

  app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "..", "website", "build"));
  });

  if (process.env.WEB_ENV === "production") {
    app.listen(3000, () => {
      server.log.ready(`Starting development web server on: http://${process.env.WEB_ADDRESS}:3000`);
      server.log.info(`To register account you need to register at: http://${process.env.WEB_ADDRESS}:3000/register`);
    });
  } else if (process.env.WEB_ENV === "development") {
    const httpServer = http.createServer(app);
    const httpsServer = https.createServer(options, app);

    httpServer.listen(80);
    httpsServer.listen(443);

    httpsServer.on("listening", () => {
      server.log.ready(`Starting web server on: http://${process.env.WEB_ADDRESS}:80`);
    });
  }
}
