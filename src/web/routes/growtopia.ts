import { Hono } from "hono";
import { type Base } from "../../core/Base";
import { readFileSync } from "fs";
import { join, relative } from "path";
import { serveStatic } from "@hono/node-server/serve-static";
import { serveStatic as serveStaticBun } from "hono/bun";

__dirname = process.cwd();

export class GrowtopiaRoute {
  public app = new Hono().basePath("/growtopia");
  public conf = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));

  constructor(public base: Base) {}

  public execute() {
    this.app.get("/hello", (ctx) => {
      return ctx.json({ message: "Hello, world!" });
    });

    this.app.all("/server_data.php", (ctx) => {
      let str = "";

      str += `server|${this.conf.web.address}\n`;

      const randPort = this.conf.web.ports[Math.floor(Math.random() * this.conf.web.ports.length)];
      str += `port|${randPort}\nloginurl|${this.conf.web.loginUrl}\ntype|1\n${this.conf.web.maintenance.enable ? "maint" : "#maint"}|${this.conf.web.maintenance.message}\nmeta|ignoremeta\nRTENDMARKERBS1001`;

      return ctx.body(str);
    });

    const rootPath = "./.cache";
    this.app.use(
      "/cache/*",
      process.env.RUNTIME_ENV === "bun"
        ? serveStaticBun({ root: rootPath })
        : serveStatic({
            root: rootPath
          })
    );

    this.app.get("/cache/*", (ctx) => {
      const route = ctx.req.url.split("/growtopia/cache/")[1];
      const url = `https://ubistatic-a.akamaihd.net/${this.base.cdn.uri}/cache/${route}`;
      return ctx.redirect(url);
    });

    return this.app;
  }
}
