import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";
import { ROLE } from "../../Constants";

export class CurrencyManager {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<Record<string, string>>
  ) { }

  public async execute(): Promise<void> {
    if (this.peer.data.role !== ROLE.DEVELOPER) {
      this.peer.send(
        Variant.from("OnConsoleMessage", "⚠️ You are not authorized.")
      );
      return;
    }

    const dialog = new DialogBuilder()
      .defaultColor()
      .addQuickExit()
      .addLabelWithIcon("Currency Manager", 11, "big")
      .addTextBox("Enter amounts to give. Leave blank for none.")

      .addInputBox("add_gems", "Gems", "", 10)
      .addInputBox("add_tokens", "Tokens (WIP)", "", 10)
      .addInputBox("add_tickets", "Tickets (WIP)", "", 10)

      .endDialog("currency_apply", "Cancel", "Apply")
      .str();

    this.peer.send(Variant.from("OnDialogRequest", dialog));
  }
}

export { CurrencyManager as CurrencyManagerCommand };
