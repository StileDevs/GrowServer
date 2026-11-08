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

  /**
   * Sends an `action|...` text packet. Server-to-client actions use the
   * GAME_MESSAGE type; the client rejects GENERIC_TEXT ("unknown packet type: 2").
   */
  public sendAction(...lines: string[]): void {
    this.send(TextPacket.from(PACKET_TYPE.GAME_MESSAGE, ...lines).parse());
  }

  public sendPlaySfx(pathFile: string, delayMS: number = 0): void {
    this.sendAction("action|play_sfx", `file|${pathFile}`, `delayMS|${delayMS}`);
  }

  /**
   * Starts (or replaces) the client's music stream. An empty path stops it.
   */
  public sendPlayMusic(pathFile: string): void {
    this.sendAction("action|play_music", `file|${pathFile}`, "delayMS|0");
  }

  /** Shows an `action|log` console line on the client. */
  public sendLog(message: string): void {
    this.sendAction("action|log", `msg|${message}`);
  }
}
