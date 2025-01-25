import { type NonEmptyObject } from "type-fest";
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
  ) {}

  public async execute(): Promise<void> {
    const itemID = parseInt(this.action.itemID);
    const invenItem = this.peer.data.inventory.items.find(
      (item) => item.id === itemID
    );
    if (!/\d/.test(this.action.trash_count)) return;
    if (!invenItem) return;

    const count = parseInt(this.action.trash_count);

    invenItem.amount = invenItem.amount - count;

    // Check if inventory amount is empty, then delete it.
    if (invenItem.amount <= 0) {
      this.peer.data.inventory.items = this.peer.data.inventory.items.filter(
        (i) => i.amount !== 0
      );
    }

    this.peer.saveToCache();
    this.peer.inventory();
  }
}
