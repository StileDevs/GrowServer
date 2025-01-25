import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { Block } from "../../types";
import { World } from "../../core/World";
import { Tile } from "../../world/Tile";
import { ItemDefinition } from "growtopia.js";

export class SignEdit {
  private world: World;
  private pos: number;
  private block: Block;
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
    this.block = this.world?.data.blocks[this.pos] as Block;
    this.itemMeta = this.base.items.metadata.items.find(
      (i) => i.id === parseInt(action.itemID)
    )!;
  }

  public async execute(): Promise<void> {
    if (this.world.data.owner) {
      if (this.world.data.owner.id !== this.peer.data?.id_user) return;
    }

    this.block.sign = {
      label: this.action.label || ""
    };

    Tile.tileUpdate(
      this.base,
      this.peer,
      this.world,
      this.block,
      this.itemMeta.type || 0
    );
  }
}
