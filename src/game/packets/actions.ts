import { Packet, PacketKind, type Peer, TextPacket } from "growtopia.wasm";
import { PACKET_TYPE } from "../../constants";

/**
 * Handles client action packets (e.g. audio SFX, particle actions, client dialogs).
 */
export class ActionsHandler {
  constructor(private peer: Peer) {}

  /**
   * Sends an action packet to the peer.
   */
  public send(data: Buffer): void {
    const packet = new Packet(data, PacketKind.Reliable);
    this.peer.send(packet);
  }

  /**
   * Plays a sound effect on the client.
   * @param file Audio file path (e.g. "audio/door_open.wav")
   * @param delayMS Optional execution delay in milliseconds
   */
  public playSFX(file: string, delayMS = 0): void {
    const data = TextPacket.from(
      PACKET_TYPE.GAME_MESSAGE,
      "action|play_sfx",
      `file|${file}`,
      `delayMS|${delayMS}`,
    );
    this.send(data.parse());
  }

  /**
   * Alias for backward compatibility.
   */
  public sendPlaySfx(pathFile: string, delayMS = 0): void {
    this.playSFX(pathFile, delayMS);
  }
}

export const PlayerAction = ActionsHandler;
