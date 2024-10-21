import { PacketType } from "../Constants.js";
import { Base } from "../core/Base.js";
import { Peer } from "../core/Peer.js";
import consola from "consola";
import { parseAction } from "../utils/Utils";
import { IActionPacket } from "../network/Action.js";
import { ITextPacket } from "../network/Text.js";
import { ITankPacket } from "../network/Tank.js";
import { Variant } from "growtopia.js";

export class RawListener {
  constructor(public base: Base) {
    consola.log('🦀 Listening ENet "raw" event');
  }

  public run(netID: number, chunk: Buffer): void {
    const peer = new Peer(this.base, netID);
    const type = chunk.readInt32LE();

    switch (type) {
      case PacketType.STR:
      case PacketType.ACTION: {
        new ITextPacket(this.base, peer, chunk).execute();
        new IActionPacket(this.base, peer, chunk).execute();
        break;
      }

      case PacketType.TANK: {
        if (chunk.length < 60) {
          peer.send(Variant.from("OnConsoleMessage", "Received invalid tank packet."));
          return peer.disconnect();
        }

        new ITankPacket(this.base, peer, chunk).execute();
        break;
      }

      default: {
        consola.debug(`Unknown PacketType of ${type}`, chunk);
        break;
      }
    }
  }
}
