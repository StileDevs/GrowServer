import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config, frontend } from "@growserver/config";
import { createServer } from "https";
import { downloadMkcert, setupMkcert } from "@growserver/utils";
import logger from "@growserver/logger";

async function init() {
  
  const app = new Hono()
  const buns = process.versions.bun ? await import("hono/bun") : undefined;

  await downloadMkcert();
  await setupMkcert();

  app.post('/growtopia/server_data.php', (ctx) => {
    let str = "";

    str += `server|${config.web.address}\n`;

    const randPort = config.web.ports[Math.floor(Math.random() * config.web.ports.length)];

    str += `port|${randPort}\nloginurl|${config.web.loginUrl}\ntype|1\n${config.web.maintenance.enable ? "maint" : "#maint"}|
      ${config.web.maintenance.message}
      \ntype2|1\nmeta|ignoremeta\nRTENDMARKERBS1001`;

    return ctx.body(str);
  })

  const fe = frontend();

  if (process.env.RUNTIME_ENV === "node") {
    serve({
      fetch: app.fetch,
      createServer,
      serverOptions: {
        key: fe.tls.key,
        cert: fe.tls.cert
      },
      port: config.web.port
    }, (info) => {
      console.log(`Node Logon Server is running on port ${info.port}`)
    })
  } else if (process.env.RUNTIME_ENV === "bun") {
    logger.info(`Running Bun HTTP server on http://localhost`);
    Bun.serve({
      fetch: app.fetch,
      port:  config.web.port,
      tls:   {
        key: fe.tls.key,
        cert: fe.tls.cert
      }
    });
  }
}


init();