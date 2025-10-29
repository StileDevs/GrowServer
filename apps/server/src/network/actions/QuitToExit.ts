import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { type NonEmptyObject } from "type-fest";

export class QuitToExit {
  constructor(
    public base: Base,
    public peer: Peer
  ) {}

  public async execute(
    _action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    this.peer.leaveWorld();
  }
}
