import { PeerData } from "../types";
import { Peer as OldPeer } from "growtopia.js";
import { Base } from "./Base.js";

export class Peer extends OldPeer<PeerData> {
  public base;
  constructor(base: Base, netID: number) {
    super(base.server, netID);
    this.base = base;
  }
}
