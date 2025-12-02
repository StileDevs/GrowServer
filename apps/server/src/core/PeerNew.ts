import {
  Peer as OldPeer,
  TankPacket,
  TextPacket,
  Variant,
  VariantOptions,
} from "growtopia.js";
import { PeerData } from "@growserver/types";
import { Base } from "./Base";
import { Name } from "../network/player/Name";

export class Peer extends OldPeer<PeerData> {
  constructor(public base: Base, public netID: number, public channelID: number) {
    super(base.server, netID, channelID);
  }


  /**
   * It should be 'data' but it seems it wont overriden, so named into 'player' instead
   */
  public get player() {
    return this.base.state.getPlayer(this.netID);
  }


  public get name() {
    return this.player ? new Name(this.player) : ;
  }

}