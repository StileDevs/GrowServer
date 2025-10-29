import { Hono } from "hono";
import { logger as logg } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { createServer } from "https";
import consola from "consola";
import type { Base } from "./Base";
import { ApiRoute } from "../web/routes/api";
import { PlayerRoute } from "../web/routes/player";
import { GrowtopiaRoute } from "../web/routes/growtopia";
import { readFile } from "fs/promises";

__dirname = process.cwd();

export async function Web(base: Base) {
  const app = new Hono();

  const buns = process.versions.bun ? await import("hono/bun") : undefined;

  app.use(logg((str, ...rest) => consola.log(str, ...rest)));

  app.use(
    "/*",
    process.env.RUNTIME_ENV === "bun" && process.versions.bun
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      buns?.serveStatic({ root: base.config.webFrontend.root })!
      : serveStatic({
        root: base.config.webFrontend.root
      })
  );

  app.route("/", await new ApiRoute(base).execute());
  app.route("/", await new PlayerRoute(base).execute());
  app.route("/", await new GrowtopiaRoute(base).execute());

  const key = await getFile(base.config.web.tls.key);
  const cert = await getFile(base.config.web.tls.cert);

  const keyPem = await getFile(
    base.config.webFrontend.tls.key
  );
  const certPem = await getFile(
    base.config.webFrontend.tls.cert
  );

  if (process.env.RUNTIME_ENV === "node") {
    serve(
      {
        fetch:         app.fetch,
        port:          base.config.web.port,
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
        port:          base.config.webFrontend.port,
        createServer,
        serverOptions: {
          key:  keyPem,
          cert: certPem
        }
      },
      () => {
        consola.log(`⛅Running Login server on https://${base.config.web.loginUrl}`);
      }
    );
  } else if (process.env.RUNTIME_ENV === "bun") {

    consola.log(`⛅Running Bun HTTP server on http://localhost`);
    Bun.serve({
      fetch: app.fetch,
      port:  base.config.web.port,
      tls:   {
        key,
        cert
      }
    });
    consola.log(`⛅Running Bun HTTPS server on https://localhost`);
    Bun.serve({
      fetch: app.fetch,
      port:  base.config.webFrontend.port,
      tls:   {
        key:  keyPem,
        cert: certPem
      }
    });
    consola.log(`⛅Running Bun Login server on https://${base.config.web.loginUrl}`);
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
