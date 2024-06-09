import { Server } from "ws";
import { type BaseServer } from "../structures/BaseServer";

export function WebSocketServer(base: BaseServer) {
  const server = new Server({ port: 8080 });

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
