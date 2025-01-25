import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import consola from "consola";

export class GazzetteEnd {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<Record<string, string>>
  ) {}

  public async execute(): Promise<void> {
    consola.info("GazzetteEnd fired 🔥🔥");
  }
}
