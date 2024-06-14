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

export class IWebSocketServer extends WebSocketServer<typeof IWebSocket> {
  constructor(...params: ConstructorParameters<typeof WebSocketServer>) {
    super({
      WebSocket: IWebSocket,
      noServer: true,
      ...params
    });
  }

  searchUser(uid: string): IWebSocket | undefined {
    for (const socket of this.clients) {
      if (socket.uid === uid) {
        return socket;
      }
    }
  }

  public everyUser(callbackfn: (user: IWebSocket, uid: string) => void): void {
    this.clients.forEach((ws) => {
      callbackfn(ws, ws.uid);
    });
  }
}
