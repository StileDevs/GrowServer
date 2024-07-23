import { Server } from "http";
import { type BaseServer } from "../structures/BaseServer.js";
import { RequestFlags, OpCode } from "../utils/enums/WebSocket.js";
import { IWebSocketServer } from "./IWebSocketServer.js";
import { customAlphabet } from "nanoid";
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export class WSServer {
  public server: IWebSocketServer;

  constructor(public base: BaseServer, public app: Server) {
    this.server = new IWebSocketServer();
  }

  public async start() {
    this.app.on("upgrade", (req, socket, head) => {
      socket.on("error", console.error);

      this.server.handleUpgrade(req, socket, head, (ws) => {
        console.log("upgrrade");
        socket.removeListener("error", console.error);
        this.server.emit("connection", ws, req);
      });
    });

    this.server.on("connection", (ws, req) => {
      const uid = customAlphabet(alphabet, 16)();
      this.base.log.info(`Client connected`, uid);

      ws.uid = uid;

      ws.sendHelloPacket();

      ws.on("close", (code, r) => {
        this.base.log.info(`Client disconnected code: ${code} | Reason: ${r}`);
      });

      ws.on("message", (data: Buffer) => {
        if (data.length < 4) return;
        console.log({ data });

        const type = data.readInt32LE(0);

        switch (type) {
          case OpCode.REQUEST: {
            const BroadCastType = data.readUInt32LE(4);
            console.log({ BroadCastType });

            if (BroadCastType & RequestFlags.SUPER_BROADCAST) ws.flags |= RequestFlags.SUPER_BROADCAST;

            ws.sendReady();
            break;
          }
        }
      });
    });

    this.server.on("listening", () => {
      this.base.log.ready("Websocket server ready!");
    });
  }
}
