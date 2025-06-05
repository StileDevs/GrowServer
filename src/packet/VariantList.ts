import { Variant } from "growtopia.js";
import { Peer } from "../core/Peer";
import { safeWrapper } from "../utils/Utils";

export class VariantList {
  private peer: Peer

  constructor(peer: Peer) {
    this.peer = peer;
  }

  public OnConsoleMessage = safeWrapper(
    (message: string) => {
      this.peer.send(Variant.from("OnConsoleMessage", message));
    }
  )
}