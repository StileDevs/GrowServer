import { type BaseServer } from "../structures/BaseServer.js";
import { BroadcastChannelsType, OpCode } from "../utils/enums/WebSocket.js";
import { IWebSocketServer } from "./IWebSocketServer.js";
import { customAlphabet } from "nanoid";
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export class WSServer {
  public server: IWebSocketServer;

  constructor(public base: BaseServer) {
    this.server = new IWebSocketServer({ port: 8080 });
  }

  public async start() {
    this.server.on("connection", (ws, req) => {
      const uid = customAlphabet(alphabet, 16)();
      this.base.log.info(`Client connected`, uid);

      ws.uid = uid;

      ws.sendHelloPacket();

      ws.on("close", (code, r) => {
        this.base.log.info(`Client disconnected code: ${code} | Reason: ${r}`);
      });

      ws.on("message", (data) => {
        console.log({ data });
        const type = (data as Buffer).readInt32LE(0);

        switch (type) {
          case OpCode.BROADCAST_CHANNELS: {
            const BroadCastType = (data as Buffer).readUInt8(4);

            if (BroadCastType === BroadcastChannelsType.SUPER_BROADCAST) {
              ws.sendReady();
            }

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
