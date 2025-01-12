import { Hono } from "hono";
import { type Base } from "../../core/Base";

export class ApiRoute {
  public app = new Hono().basePath("/api");

  constructor(public base: Base) {}

  public async execute() {
    this.app.get("/hello", (ctx) => {
      return ctx.json({ message: "Hello, world!" });
    });

    return this.app;
  }
}
