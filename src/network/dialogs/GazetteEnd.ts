import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base.js";
import { Peer } from "../../core/Peer.js";
import consola from "consola";

export class GazzetteEnd {
  constructor(public base: Base, public peer: Peer, public action: NonEmptyObject<any>) {}

  public async execute(): Promise<void> {
    consola.info("GazzetteEnd fired 🔥🔥");
  }
}
