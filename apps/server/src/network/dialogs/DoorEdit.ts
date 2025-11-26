import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { TileData } from "@growserver/types";
import { World } from "../../core/World";
import { Tile } from "../../world/Tile";
import { ItemDefinition } from "grow-items";
import { tileFrom } from "../../world/tiles";
import { LockPermission, TileFlags } from "@growserver/const";

export class DoorEdit {
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
      label: string;
      target: string;
      checkbox_public: string;
      id: string;
    }>,
  ) {
    this.world = this.peer.currentWorld()!;
    this.pos =
      parseInt(this.action.tilex) +
      parseInt(this.action.tiley) * (this.world?.data.width as number);
    this.block = this.world?.data.blocks[this.pos] as TileData;
    this.itemMeta = this.base.items.metadata.items.find(
      (i) => i.id === parseInt(action.itemID),
    )!;
  }

  public async execute(): Promise<void> {
    if (
      !this.action.dialog_name ||
      !this.action.tilex ||
      !this.action.tiley ||
      !this.action.itemID ||
      !this.action.label ||
      !this.action.target ||
      !this.action.checkbox_public ||
      !this.action.id
    )
      return;
    if (
      !(await this.world.hasTilePermission(
        this.peer.data.userID,
        this.block,
        LockPermission.BUILD,
      )) ||
      !this.block.door
    ) {
      return;
    }

    this.block.door = {
      label:       this.action.label || "",
      destination: this.action.target?.toUpperCase() || "",
      id:          this.action.id?.toUpperCase() || "",
    };

    if (this.action.checkbox_public == "1") {
      this.block.flags |= TileFlags.PUBLIC;
    } else {
      this.block.flags &= ~TileFlags.PUBLIC; // unset PUBLIC flag
    }

    const doorTile = tileFrom(this.base, this.world, this.block);
    this.world.every((p) => doorTile.tileUpdate(p));
  }
}
