import { PacketType } from "../Constants.js";
import { Base } from "../core/Base.js";
import { Peer } from "../core/Peer.js";
import consola from "consola";
import { parseAction } from "../utils/Utils";
import { ActionPacket } from "../network/Action.js";
import { StrPacket } from "../network/Str.js";

export class RawListener {
  constructor(public base: Base) {
    consola.log('🦀 Listening ENet "raw" event');
  }

  public run(netID: number, chunk: Buffer): void {
    const peer = new Peer(this.base, netID);
    const type = chunk.readInt32LE();

    switch (type) {
      case PacketType.STR: {
        new StrPacket(this.base, peer, chunk).execute();
        break;
      }

      case PacketType.ACTION: {
        new ActionPacket(this.base, peer, chunk).execute();
        break;
      }

      default: {
        consola.debug(`Unknown PacketType of ${type}`, chunk);
        break;
      }
    }
  }
}
