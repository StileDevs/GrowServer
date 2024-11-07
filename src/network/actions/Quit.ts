import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base.js";
import { Peer } from "../../core/Peer.js";

export class Quit {
  constructor(public base: Base, public peer: Peer) {}

  public async execute(action: NonEmptyObject<{ action: string }>): Promise<void> {
    this.peer.disconnect();
  }
}
