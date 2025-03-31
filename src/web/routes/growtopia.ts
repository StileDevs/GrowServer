import { Hono, type MiddlewareHandler } from "hono";
import { type Base } from "../../core/Base";
import { readFileSync } from "fs";
import { join } from "path";
import { serveStatic } from "@hono/node-server/serve-static";

__dirname = process.cwd();

export class GrowtopiaRoute {
  public app = new Hono().basePath("/growtopia");
  public conf = JSON.parse(
    readFileSync(join(__dirname, "config.json"), "utf-8")
  );

  constructor(public base: Base) {}

  public async execute() {
    const buns =
      process.env.RUNTIME_ENV === "bun" && process.versions.bun
        ? await import("hono/bun")
        : undefined;

    this.app.get("/hello", (ctx) => {
      return ctx.json({ message: "Hello, world!" });
    });

    this.app.all("/server_data.php", (ctx) => {
      let str = "";

      str += `server|${this.conf.web.address}\n`;

      const randPort =
        this.conf.web.ports[
          Math.floor(Math.random() * this.conf.web.ports.length)
        ];
      str += `port|${randPort}\nloginurl|${this.conf.web.loginUrl}\ntype|1\n${this.conf.web.maintenance.enable ? "maint" : "#maint"}|${
        this.conf.web.maintenance.message
      }\nmeta|ignoremeta\nRTENDMARKERBS1001`;

      return ctx.body(str);
    });

    const rootPath = "./.cache";
    const staticMiddleware =
      process.env.RUNTIME_ENV === "bun" && process.versions.bun
        ? (buns?.serveStatic({ root: rootPath }) as MiddlewareHandler)
        : serveStatic({
          root: rootPath
        });
    this.app.use("/cache/*", staticMiddleware);

    return this.app;
  }
}
