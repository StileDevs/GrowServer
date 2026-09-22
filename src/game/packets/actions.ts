import { Packet, PacketKind, Peer, TextPacket } from "growtopia.wasm";
import { PACKET_TYPE } from "../../constants";

export class ActionsHandler {
  constructor(private peer: Peer) {}

  private send(data: Buffer): void {
    const packet = new Packet(data, PacketKind.Reliable);
    this.peer.send(packet);
  }

  public sendPlaySfx(pathFile: string, delayMS: number = 0): void {
    const data = TextPacket.from(PACKET_TYPE.GENERIC_TEXT, "action|play", `file|${pathFile}`, `delayMS|${delayMS}`);
    this.send(data.parse());
  }
}
