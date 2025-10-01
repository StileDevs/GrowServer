import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { Variant } from "growtopia.js";

export class KillShop {
  constructor(
    public base: Base,
    public peer: Peer
  ) { }

  public async execute(
    _action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    this.peer.send(Variant.from("OnStorePurchaseResult"));
  }
}


