// src/network/dialogs/currencyApply.ts
import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { Variant } from "growtopia.js";
import { ROLE } from "../../Constants";

export class CurrencyApply {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<Record<string, string>>
  ) { }

  public async execute(): Promise<void> {
    if (this.peer.data.role !== ROLE.DEVELOPER) {
      this.peer.send(Variant.from("OnConsoleMessage", "⚠️ Unauthorized."));
      return;
    }

    const parseAdd = (field: string): number => {
      const v = parseInt(this.action[field] ?? "");
      return isNaN(v) ? 0 : v;
    };

    // 1) Gems
    const gems = parseAdd("add_gems");
    if (gems > 0) {
      // update server state
      this.peer.data.gems += gems;

      // push immediate UI update with the correct variant
      this.peer.send(Variant.from("OnSetBux", this.peer.data.gems));

      // chat notification
      this.peer.send(
        Variant.from("OnTextOverlay", `You have been given ${gems} Gems!`)
      );
    }

    // 2) Tokens (placeholder)
    const tokens = parseAdd("add_tokens");
    if (tokens > 0) {
      this.peer.send(
        Variant.from("OnConsoleMessage", `\`6(Placeholder) You have been given ${tokens} Tokens!`)
      );
    }

    // 3) Tickets (placeholder)
    const tickets = parseAdd("add_tickets");
    if (tickets > 0) {
      this.peer.send(
        Variant.from("OnConsoleMessage", `\`6(Placeholder) You have been given ${tickets} Tickets!`)
      );
    }

    // persist
    await this.peer.saveToCache();
    await this.peer.saveToDatabase();
  }
}

export { CurrencyApply as CurrencyApplyCommand };
