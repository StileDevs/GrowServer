import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config, logon } from "@growserver/config";
import { createServer } from "https";
import logger from "@growserver/logger";

async function init() {
  const app = new Hono();
  const buns = process.versions.bun ? await import("hono/bun") : undefined;

  app.use("*", async (ctx, next) => {
    const method = ctx.req.method;
    const path = ctx.req.path;
    logger.info(`[${method}] ${path}`);
    await next();
  });

  app.post("/growtopia/server_data.php", (ctx) => {
    let str = "";

    str += `server|${config.web.address}\n`;

    const randPort =
      config.web.ports[Math.floor(Math.random() * config.web.ports.length)];

    str += `port|${randPort}\nloginurl|${config.web.loginUrl}\ntype|1\n${config.web.maintenance.enable ? "maint" : "#maint"}|
      ${config.web.maintenance.message}
      \ntype2|1\nmeta|ignoremeta\nRTENDMARKERBS1001`;

    return ctx.body(str);
  });

  const ssl = logon();

  if (process.env.RUNTIME_ENV === "node") {
    serve(
      {
        fetch: app.fetch,
        createServer,
        serverOptions: {
          key: ssl.tls.key,
          cert: ssl.tls.cert,
        },
        port: config.web.port,
      },
      (info) => {
        logger.info(`Node Logon Server is running on port ${info.port}`);
      },
    );
  } else if (process.env.RUNTIME_ENV === "bun") {
    logger.info(`Bun Logon Server is running on port ${config.web.port}`);
    Bun.serve({
      fetch: app.fetch,
      port: config.web.port,
      tls: {
        key: ssl.tls.key,
        cert: ssl.tls.cert,
      },
    });
  }
}

init();
