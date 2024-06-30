import { WebSocketServer, WebSocket as WSC } from "ws";
import { OpCode } from "../utils/enums/WebSocket.js";

export class IWebSocket extends WSC {
  public uid!: string;
  public flags!: number;

  public sendHelloPacket() {
    const buf = Buffer.alloc(4);
    buf.writeInt32LE(OpCode.HELLO);
    this.send(buf);
  }

  public sendReady() {
    const buf = Buffer.alloc(4);
    buf.writeInt32LE(OpCode.READY);
    this.send(buf);
  }
}
