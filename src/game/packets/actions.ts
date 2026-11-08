import { Packet, PacketKind, Peer, TextPacket } from "growtopia.wasm";
import { PACKET_TYPE } from "../../constants";

export class ActionsHandler {
  constructor(private peer: Peer) {}

  private send(data: Buffer): void {
    try {
      this.peer.send(new Packet(data, PacketKind.Reliable));
    } catch {
      // the peer is already gone; nothing to deliver to
    }
  }

  public sendPlaySfx(pathFile: string, delayMS: number = 0): void {
    const data = TextPacket.from(PACKET_TYPE.GENERIC_TEXT, "action|play", `file|${pathFile}`, `delayMS|${delayMS}`);
    this.send(data.parse());
  }
}
