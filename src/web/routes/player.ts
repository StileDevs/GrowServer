import { Hono } from "hono";
import { type Base } from "../../core/Base";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readFileSync } from "fs";
import { join } from "path";
import consola from "consola";
import type { FormData } from "undici";

__dirname = process.cwd();
export class PlayerRoute {
  public app = new Hono().basePath("/player");
  constructor(public base: Base) {}

  public async execute() {
    this.app.get("/growid/login/validate", (ctx) => {
      try {
        const query = ctx.req.query();
        const token = query.token;
        if (!token) throw new Error("No token provided");

        return ctx.html(
          JSON.stringify({
            status:      "success",
            message:     "Account Validated.",
            token,
            url:         "",
            accountType: "growtopia"
          })
        );
      } catch (e) {
        return ctx.body(`Unauthorized: ${e}`, 401);
      }
    });

    this.app.post("/login/validate", async (ctx) => {
      try {
        const body = await ctx.req.json();
        const growId = body.data?.growId;
        const password = body.data?.password;

        if (!growId || !password) throw new Error("Unauthorized");

        const user = await this.base.database.players.get(growId.toLowerCase());
        if (!user) throw new Error("User not found");

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error("Password invalid");

        const token = jwt.sign(
          { growId, password },
          process.env.JWT_SECRET as string
        );

        return ctx.html(
          JSON.stringify({
            status:      "success",
            message:     "Account Validated.",
            token,
            url:         "",
            accountType: "growtopia"
          })
        );
      } catch (e) {
        return ctx.body(`Unauthorized: ${e}`, 401);
      }
    });

    this.app.post("/growid/checktoken", async (ctx) => {
      try {
        const formData = await ctx.req.formData() as FormData;
        const refreshToken = formData.get("refreshToken") as string;

        if (!refreshToken) throw new Error("Unauthorized");

        jwt.verify(refreshToken, process.env.JWT_SECRET as string);

        return ctx.html(
          JSON.stringify({
            status:      "success",
            message:     "Account Validated.",
            token:       refreshToken,
            url:         "",
            accountType: "growtopia"
          })
        );
      } catch (e) {
        consola.error("Error checking token:", e);
        return ctx.body("Unauthorized", 401);
      }
    });

    this.app.post("/signup", async (ctx) => {
      try {
        const body = await ctx.req.json();
        const growId = body.data?.growId;
        const password = body.data?.password;
        const confirmPassword = body.data?.confirmPassword;

        if (!growId || !password || !confirmPassword)
          throw new Error("Unauthorized");

        // Check if user already exists
        const user = await this.base.database.players.get(growId.toLowerCase());
        if (user) throw new Error("User already exists");

        // Check if password and confirm password match
        if (password !== confirmPassword)
          throw new Error("Password and Confirm Password does not match");

        // Save player to database
        await this.base.database.players.set(growId, password);

        // Login user:
        const token = jwt.sign(
          { growId, password },
          process.env.JWT_SECRET as string
        );

        if (!token) throw new Error("Unauthorized");

        jwt.verify(token, process.env.JWT_SECRET as string);

        return ctx.html(
          JSON.stringify({
            status:      "success",
            message:     "Account Validated.",
            token,
            url:         "",
            accountType: "growtopia"
          })
        );
      } catch (e) {
        consola.error("Error signing up:", e);
        return ctx.body("Unauthorized", 401);
      }
    });

    this.app.post("/login/dashboard", (ctx) => {
      const html = readFileSync(
        join(__dirname, ".cache", "website", "index.html"),
        "utf-8"
      );
      return ctx.html(html);
    });

    return this.app;
  }
}
