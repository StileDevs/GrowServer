import express from "express";
import { BaseServer } from "../structures/BaseServer";

const router = express.Router();

export function ApiRouter(server: BaseServer) {
  router.get("/online", (_req, res) => {
    res.json({ online: server.cache.users.size });
  });

  return router;
}
