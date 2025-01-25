import { Hono } from "hono";
import { logger as logg } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { createServer } from "https";
import { join, relative } from "path";
import consola from "consola";
import type { Base } from "./Base";
import { ApiRoute } from "../web/routes/api";
import { PlayerRoute } from "../web/routes/player";
import { GrowtopiaRoute } from "../web/routes/growtopia";
import { readFile } from "fs/promises";

__dirname = process.cwd();

export async function Web(base: Base) {
  const confFile = await getFile(join(__dirname, "config.json"), "utf-8");
  const conf = JSON.parse(confFile as string);
  const app = new Hono();

  const buns = process.versions.bun ? await import("hono/bun") : undefined;

  app.use(logg((str, ...rest) => consola.log(str, ...rest)));

  const rootPath = relative(__dirname, join(__dirname, ".cache", "website"));
  app.use(
    "/*",
    process.env.RUNTIME_ENV === "bun" && process.versions.bun
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      buns?.serveStatic({ root: rootPath })!
      : serveStatic({
        root: rootPath
      })
  );

  app.route("/", await new ApiRoute(base).execute());
  app.route("/", await new PlayerRoute(base).execute());
  app.route("/", await new GrowtopiaRoute(base).execute());

  const key = await getFile(join(__dirname, "assets", "ssl", "server.key"));
  const cert = await getFile(join(__dirname, "assets", "ssl", "server.crt"));

  const keyPem = await getFile(
    join(__dirname, ".cache", "ssl", "_wildcard.growserver.app-key.pem")
  );
  const certPem = await getFile(
    join(__dirname, ".cache", "ssl", "_wildcard.growserver.app.pem")
  );
  if (process.env.RUNTIME_ENV === "node") {
    serve(
      {
        fetch: app.fetch,
        port:  80
      },
      () => {
        consola.log(`⛅Running HTTP server on http://localhost`);
      }
    );

    serve(
      {
        fetch:         app.fetch,
        port:          443,
        createServer,
        serverOptions: {
          key,
          cert
        }
      },
      () => {
        consola.log(`⛅Running HTTPS server on https://localhost`);
      }
    );

    serve(
      {
        fetch:         app.fetch,
        port:          8080,
        createServer,
        serverOptions: {
          key:  keyPem,
          cert: certPem
        }
      },
      () => {
        consola.log(`⛅Running Login server on https://${conf.web.loginUrl}`);
      }
    );
  } else if (process.env.RUNTIME_ENV === "bun") {
    Bun.serve({
      fetch: app.fetch,
      port:  80
    });
    consola.log(`⛅Running Bun HTTP server on http://localhost`);
    Bun.serve({
      fetch: app.fetch,
      port:  443,
      tls:   {
        key,
        cert
      }
    });
    consola.log(`⛅Running Bun HTTPS server on https://localhost`);
    Bun.serve({
      fetch: app.fetch,
      port:  8080,
      tls:   {
        key:  keyPem,
        cert: certPem
      }
    });
    consola.log(`⛅Running Bun Login server on https://${conf.web.loginUrl}`);
  }
}

async function getFile(path: string, encoding?: BufferEncoding) {
  try {
    const file = await readFile(path, encoding);
    return file;
  } catch (e) {
    consola.error(`${path} are not found`, e);
    return undefined;
  }
}
