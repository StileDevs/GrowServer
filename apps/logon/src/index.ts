import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config, frontend } from "@growserver/config";
import { createServer } from "https";
import { downloadMkcert, setupMkcert } from "@growserver/utils";




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


  // TODO: refactor custom item cdn
  // const rootPath = "./.cache";
  // const staticMiddleware =
  //   process.env.RUNTIME_ENV === "bun" && process.versions.bun
  //     ? (buns?.serveStatic({ root: rootPath }) as MiddlewareHandler)
  //     : serveStatic({
  //       root: rootPath
  //     });
  // this.app.use("/cache/*", staticMiddleware);

  const fe = frontend();
  
  serve({
    fetch: app.fetch,
    createServer,
    serverOptions: {
      key: fe.tls.key,
      cert: fe.tls.cert
    },
    port: config.web.port
  }, (info) => {
    console.log(`Logon Server is running on port ${info.port}`)
  })

}


init();