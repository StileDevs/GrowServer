import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { type NonEmptyObject } from "type-fest";

export class QuitToExit {
  constructor(public base: Base, public peer: Peer) {}

  public async execute(action: NonEmptyObject<{ action: string }>): Promise<void> {
    this.peer.leaveWorld();
  }
}
