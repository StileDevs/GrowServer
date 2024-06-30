import { WebSocketServer } from "ws";
import { IWebSocket } from "./IWebsocket.js";

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
    this.eventNames;
    this.clients.forEach((ws) => {
      callbackfn(ws, ws.uid);
    });
  }
}
