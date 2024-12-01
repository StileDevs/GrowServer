import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";

export class RespawnSpike {
  constructor(public base: Base, public peer: Peer) {}

  public async execute(action: NonEmptyObject<{ action: string }>): Promise<void> {
    this.peer.respawn();
  }
}
