import { createRequire } from "node:module";
import type { Server } from "ws";
const Websocket = createRequire(import.meta.url)("ws").Server;
import { type BaseServer } from "../structures/BaseServer.js";

export async function WebSocketServer(base: BaseServer) {
  const server = new Websocket({ port: 8080 }) as Server;

  server.on("connection", (ws, req) => {
    base.log.info(`Client connected`, req.headers["sec-websocket-key"]);

    console.log(server.clients);
    ws.send(JSON.stringify({ op: 0 }));

    ws.on("close", (code, r) => {
      base.log.info(`Client disconnected code: ${code} | Reason: ${r}`);
    });

    ws.on("message", (data) => {
      base.log.info(`Message: ${data.toString()}`);
    });
  });

  server.on("listening", () => {
    base.log.ready("Websocket server ready!");
  });
}
