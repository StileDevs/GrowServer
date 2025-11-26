import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { Variant } from "growtopia.js";

export class FindItemEnd {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      buttonClicked: string;
    }>,
  ) {}

  public async execute(): Promise<void> {
    if (!this.action.dialog_name || !this.action.buttonClicked) return;
    const itemID = parseInt(this.action.buttonClicked);

    this.peer.data?.inventory?.items.push({ id: itemID, amount: 200 });
    this.peer.send(
      Variant.from(
        "OnConsoleMessage",
        `Added \`6${this.base.items.metadata.items.get(itemID.toString())?.name}\`\` to your inventory.`,
      ),
    );
    this.peer.inventory();
    this.peer.saveToCache();
  }
}
