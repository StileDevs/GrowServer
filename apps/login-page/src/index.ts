import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config, frontend } from "@growserver/config";
import { createServer } from "https";
import {
  downloadMkcert,
  downloadWebsite,
  setupMkcert,
  setupWebsite,
} from "@growserver/utils";
import logger from "@growserver/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Database } from "@growserver/db";

async function init() {
  const app = new Hono();
  const buns = process.versions.bun ? await import("hono/bun") : undefined;
  const db = new Database();

  await downloadMkcert();
  await downloadWebsite();

  await setupMkcert();
  await setupWebsite();

  app.use("*", async (ctx, next) => {
    const method = ctx.req.method;
    const path = ctx.req.path;
    logger.info(`[${method}] ${path}`);
    await next();
  });

  app.use(
    "/*",
    process.env.RUNTIME_ENV === "bun" && process.versions.bun
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        buns?.serveStatic({ root: config.webFrontend.root })!
      : serveStatic({
          root: config.webFrontend.root,
        }),
  );

  app.get("/player/growid/login/validate", (ctx) => {
    try {
      const query = ctx.req.query();
      const token = query.token;
      if (!token) throw new Error("No token provided");

      return ctx.html(
        JSON.stringify({
          status: "success",
          message: "Account Validated.",
          token,
          url: "",
          accountType: "growtopia",
        }),
      );
    } catch (e) {
      return ctx.body(`Unauthorized: ${e}`, 401);
    }
  });

  app.post("/player/login/validate", async (ctx) => {
    try {
      const body = await ctx.req.json();
      const growId = body.data?.growId;
      const password = body.data?.password;

      if (!growId || !password) throw new Error("Unauthorized");

      const user = await db.players.get(growId.toLowerCase());
      if (!user) throw new Error("User not found");

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) throw new Error("Password invalid");

      const token = jwt.sign(
        { growId, password },
        process.env.JWT_SECRET as string,
      );

      return ctx.html(
        JSON.stringify({
          status: "success",
          message: "Account Validated.",
          token,
          url: "",
          accountType: "growtopia",
        }),
      );
    } catch (e) {
      return ctx.body(`Unauthorized: ${e}`, 401);
    }
  });

  app.post("/player/growid/checktoken", async (ctx) => {
    try {
      const formData = (await ctx.req.formData()) as FormData;
      const refreshToken = formData.get("refreshToken") as string;

      if (!refreshToken) throw new Error("Unauthorized");

      jwt.verify(refreshToken, process.env.JWT_SECRET as string);

      return ctx.html(
        JSON.stringify({
          status: "success",
          message: "Account Validated.",
          token: refreshToken,
          url: "",
          accountType: "growtopia",
        }),
      );
    } catch (e) {
      logger.error(`Error checking token: ${e}`);
      return ctx.body("Unauthorized", 401);
    }
  });

  app.post("/player/signup", async (ctx) => {
    try {
      const body = await ctx.req.json();
      const growId = body.data?.growId;
      const password = body.data?.password;
      const confirmPassword = body.data?.confirmPassword;

      if (!growId || !password || !confirmPassword)
        throw new Error("Unauthorized");

      // Check if user already exists
      const user = await db.players.get(growId.toLowerCase());
      if (user) throw new Error("User already exists");

      // Check if password and confirm password match
      if (password !== confirmPassword)
        throw new Error("Password and Confirm Password does not match");

      // Save player to database
      await db.players.set(growId, password);

      // Login user:
      const token = jwt.sign(
        { growId, password },
        process.env.JWT_SECRET as string,
      );

      if (!token) throw new Error("Unauthorized");

      jwt.verify(token, process.env.JWT_SECRET as string);

      return ctx.html(
        JSON.stringify({
          status: "success",
          message: "Account Validated.",
          token,
          url: "",
          accountType: "growtopia",
        }),
      );
    } catch (e) {
      logger.error(`Error signing up: ${e}`);
      return ctx.body("Unauthorized", 401);
    }
  });

  app.post("/player/login/dashboard", (ctx) => {
    const html = readFileSync(
      join(__dirname, "..", ".cache", "website", "index.html"),
      "utf-8",
    );
    return ctx.html(html);
  });

  const fe = frontend();

  if (process.env.RUNTIME_ENV === "node") {
    serve(
      {
        fetch: app.fetch,
        createServer,
        serverOptions: {
          key: fe.tls.key,
          cert: fe.tls.cert,
        },
        port: config.webFrontend.port,
      },
      (info) => {
        logger.info(`Node Login Page Server is running on port ${info.port}`);
      },
    );
  } else if (process.env.RUNTIME_ENV === "bun") {
    logger.info(`Bun Login Page Server is running on port ${config.web.port}`);
    Bun.serve({
      fetch: app.fetch,
      port: config.webFrontend.port,
      tls: {
        key: fe.tls.key,
        cert: fe.tls.cert,
      },
    });
  }
}

init();
