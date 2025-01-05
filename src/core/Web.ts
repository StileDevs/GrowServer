import { Hono } from "hono";
import { logger as logg } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { createServer } from "https";
import { readFileSync } from "fs";
import { join, relative } from "path";
import consola from "consola";
import type { Base } from "./Base";
import { ApiRoute } from "../web/routes/api";
import { PlayerRoute } from "../web/routes/player";
import { GrowtopiaRoute } from "../web/routes/growtopia";

__dirname = process.cwd();

export async function Web(base: Base) {
  const conf = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));
  const app = new Hono();

  app.use(logg((str, ...rest) => consola.log(str, ...rest)));

  app.use(
    "/*",
    serveStatic({
      root: relative(__dirname, join(__dirname, ".cache", "website"))
    })
  );

  app.route("/", new ApiRoute(base).execute());
  app.route("/", new PlayerRoute(base).execute());
  app.route("/", new GrowtopiaRoute(base).execute());

  serve(
    {
      fetch: app.fetch,
      port: 80
    },
    (info) => {
      consola.log(`⛅ Running HTTP server on http://localhost`);
    }
  );

  serve(
    {
      fetch: app.fetch,
      port: 443,
      createServer,
      serverOptions: {
        key: readFileSync(join(__dirname, "assets", "ssl", "server.key")),
        cert: readFileSync(join(__dirname, "assets", "ssl", "server.crt"))
      }
    },
    (info) => {
      consola.log(`⛅ Running HTTPS server on https://localhost`);
    }
  );

  serve(
    {
      fetch: app.fetch,
      port: 8080,
      createServer,
      serverOptions: {
        key: readFileSync(join(__dirname, ".cache", "ssl", "_wildcard.growserver.app-key.pem")),
        cert: readFileSync(join(__dirname, ".cache", "ssl", "_wildcard.growserver.app.pem"))
      }
    },
    (info) => {
      consola.log(`⛅ Running Login server on https://${conf.web.loginUrl}`);
    }
  );
}
