import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { TileData } from "../../types";
import { World } from "../../core/World";
import { Tile } from "../../world/Tile";
import { ItemDefinition } from "grow-items";
import { tileFrom } from "../../world/tiles";

export class SignEdit {
  private world: World;
  private pos: number;
  private block: TileData;
  private itemMeta: ItemDefinition;

  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      tilex: string;
      tiley: string;
      itemID: string;
      label?: string;
    }>
  ) {
    this.world = this.peer.currentWorld()!;
    this.pos =
      parseInt(this.action.tilex) +
      parseInt(this.action.tiley) * (this.world?.data.width as number);
    this.block = this.world?.data.blocks[this.pos] as TileData;
    this.itemMeta = this.base.items.metadata.items.find(
      (i) => i.id === parseInt(action.itemID)
    )!;
  }

  public async execute(): Promise<void> {
    const ownerUID = this.world.getOwnerUID();

    if (ownerUID) {
      if (ownerUID !== this.peer.data?.userID) return;
    }

    this.block.sign = {
      label: this.action.label || ""
    };

    const signTile = tileFrom(this.base, this.world, this.block);
    this.world.every((p) => signTile.tileUpdate(p));
  }
}
