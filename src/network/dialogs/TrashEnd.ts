import { type NonEmptyObject } from "type-fest";
import { Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";

export class TrashEnd {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      trash_count: string;
      itemID: string;
    }>
  ) { }

  public async execute(): Promise<void> {
    if (!this.action.dialog_name || !this.action.trash_count || !this.action.itemID) return;
    const itemID = parseInt(this.action.itemID);
    const invenItem = this.peer.data.inventory.items.find(
      (item) => item.id === itemID
    );
    if (!/\d/.test(this.action.trash_count)) return;
    if (!invenItem) return;

    const count = parseInt(this.action.trash_count);

    // Validate Trash Count
    if (count <= 0) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "`4You must enter a positive number!``"
        )
      );
      return;
    }

    if (count > invenItem.amount) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "`4You don't have that many items to trash!``"
        )
      );
      return;
    }

    // Use the RemoveItemInven Method Instead of Direct Subtraction
    this.peer.removeItemInven(itemID, count);

    this.peer.saveToCache();
    this.peer.inventory();
  }
}