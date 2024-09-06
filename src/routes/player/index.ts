import type { BaseServer } from "../../structures/BaseServer.js";
import { Router } from "express";
import { readFileSync } from "fs";
import path from "path";
import { LoginSchema, RegisterSchema } from "./ZodSchema.js";
import { decrypt } from "../../utils/Utils.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

export function PlayerRouter(server: BaseServer) {
  router.post("/growid/checktoken", (req, res, next) => {
    const token = req.body.refreshToken;
    if (!token) return res.sendStatus(401);

    res.send(
      JSON.stringify({
        status: "success",
        message: "Account Validated.",
        token,
        url: "",
        accountType: "growtopia"
      })
    );
  });

  router.get("/growid/login/validate", (req, res, next) => {
    const token = req.query.token;
    res.send(
      JSON.stringify({
        status: "success",
        message: "Account Validated.",
        token,
        url: "",
        accountType: "growtopia"
      })
    );
  });

  router.post("/login/dashboard", (req, res) => {
    const html = readFileSync(path.join(__dirname, "..", "..", "..", "assets", "website", "index.html"), "utf8");
    res.send(html);
  });

  router.post("/login/validate", async (req, res, next) => {
    try {
      const validate = LoginSchema.safeParse(req.body);

      if (!validate.success) throw validate.error;
      const { growId, password } = validate.data;

      const user = await server.database.getUser(growId.toLowerCase());

      if (!user || password !== decrypt(user?.password)) return res.sendStatus(401);

      const token = Buffer.from(`_token=&growId=${growId}&password=${password}`).toString("base64");
      res.json({ token });
    } catch (e) {
      return res.sendStatus(401);
    }
  });

  router.post("/signup", async (req, res, next) => {
    try {
      const validate = RegisterSchema.safeParse(req.body);

      if (!validate.success) throw validate.error;
      const { growId, password } = validate.data;

      const ifUserExist = await server.database.getUser(growId);
      const userExist = ifUserExist?.name.toLowerCase();

      if (growId === userExist) {
        return res.status(400).json({ message: "Account already exist" });
      }

      const result = await server.database.createUser(growId, password);
      if (!result) throw new Error("Failed");

      const token = Buffer.from(`_token=&growId=${growId}&password=${password}`).toString("base64");
      res.json({ token });
    } catch (e) {
      return res.status(400).json({ message: "Failed to create account" });
    }
  });

  return router;
}
