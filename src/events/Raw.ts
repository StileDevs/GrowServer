import { PacketTypes } from "../Constants";
import { Base } from "../core/Base";
import { Peer } from "../core/Peer";
import consola from "consola";
import { IActionPacket } from "../network/Action";
import { ITextPacket } from "../network/Text";
import { ITankPacket } from "../network/Tank";
import { Variant } from "growtopia.js";

export class RawListener {
  constructor(public base: Base) {
    consola.log('🧷Listening ENet "raw" event');
  }

  public run(netID: number, _channelID: number, chunk: Buffer): void {
    const peer = new Peer(this.base, netID);
    const type = chunk.readInt32LE();

    switch (type) {
      case PacketTypes.STR:
      case PacketTypes.ACTION: {
        new ITextPacket(this.base, peer, chunk).execute();
        new IActionPacket(this.base, peer, chunk).execute();
        break;
      }

      case PacketTypes.TANK: {
        if (chunk.length < 60) {
          peer.send(
            Variant.from("OnConsoleMessage", "Received invalid tank packet.")
          );
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
