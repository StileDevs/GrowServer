import { Hono } from "hono";
import { logger as logg } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { createServer } from "https";
import { readFileSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import consola from "consola";
import jwt from "jsonwebtoken";

const __dirname = dirname(fileURLToPath(import.meta.url));
const conf = JSON.parse(readFileSync(join(__dirname, "..", "config.json"), "utf-8"));

export async function Web() {
  const app = new Hono();

  app.use(logg((str, ...rest) => consola.log(str, ...rest)));

  // const from = join(__dirname, "..", "..", "..");
  // const to = join(__dirname, "..", ".cache", "website");
  // const root = relative(from, to);

  // app.use(
  //   "/*",
  //   serveStatic({
  //     root
  //   })
  // );
  // app.get("/", (ctx) =>
  //   ctx.json({
  //     message: "Hello world"
  //   })
  // );

  app.all("/growtopia/server_data.php", (ctx) => {
    let str = "";

    str += `server|${conf.web.address}\n`;

    const randPort = conf.web.ports[Math.floor(Math.random() * conf.web.ports.length)];
    str += `port|${randPort}\nloginurl|${conf.web.loginUrl}\ntype|1\n${conf.web.maintenance.enable ? "maint" : "#maint"}|${conf.web.maintenance.message}\nmeta|ignoremeta\nRTENDMARKERBS1001`;

    return ctx.body(str);
  });

  app.post("/player/login/validate", async (ctx) => {
    const formData = await ctx.req.formData();
    const growID = formData.get("growID") as string;
    const password = formData.get("password") as string;

    // const { token } = await ctx.req.json<{ token: string }>();
    if (!growID && !password) return ctx.status(401);

    const token = jwt.sign({ growID, password }, process.env.JWT_SECRET as string);

    return ctx.html(
      JSON.stringify({
        status: "success",
        message: "Account Validated.",
        token,
        url: "",
        accountType: "growtopia"
      })
    );
  });

  app.all("/player/login/dashboard", (ctx) => {
    const html = readFileSync(join(__dirname, "..", "assets", "website", "login.html"), "utf-8");
    return ctx.html(html);
  });

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
        key: readFileSync(join(__dirname, "..", "assets", "ssl", "server.key")),
        cert: readFileSync(join(__dirname, "..", "assets", "ssl", "server.crt"))
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
        key: readFileSync(join(__dirname, "..", ".cache", "ssl", "_wildcard.growserver.app-key.pem")),
        cert: readFileSync(join(__dirname, "..", ".cache", "ssl", "_wildcard.growserver.app.pem"))
      }
    },
    (info) => {
      consola.log(`⛅ Running Login server on https://${conf.web.loginUrl}`);
    }
  );
}
