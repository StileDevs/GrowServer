import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import logger from "@growserver/logger";
export class GazzetteEnd {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<Record<string, string>>,
  ) {}

  public async execute(): Promise<void> {
    logger.info("GazzetteEnd fired 🔥🔥");
  }
}
