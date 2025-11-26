import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { TileData } from "@growserver/types";
import { World } from "../../core/World";
import { Tile } from "../../world/Tile";
import { ItemDefinition } from "grow-items";
import { tileFrom } from "../../world/tiles";
import { LockPermission, ROLE, TileFlags } from "@growserver/const";
import { DisplayBlockTile } from "../../world/tiles/DisplayBlockTile";

export class DisplayBlockEdit {
  private world: World;
  private pos: number;
  private block: TileData;

  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<{
      dialog_name: string;
      tilex: string;
      tiley: string;
    }>,
  ) {
    this.world = this.peer.currentWorld()!;
    this.pos =
      parseInt(this.action.tilex) +
      parseInt(this.action.tiley) * (this.world?.data.width as number);
    this.block = this.world?.data.blocks[this.pos] as TileData;
  }

  public async execute(): Promise<void> {
    if (!this.action.dialog_name || !this.action.tilex || !this.action.tiley)
      return;
    if (!this.block.displayBlock) return;
    const ownerUID = this.world.getTileOwnerUID(this.block);
    if (
      ownerUID &&
      ownerUID != this.peer.data.userID &&
      this.peer.data.role != ROLE.DEVELOPER
    ) {
      return;
    }

    const itemMeta = this.base.items.metadata.items.get(
      this.block.displayBlock!.displayedItem.toString(),
    )!;
    const dBlock = tileFrom(
      this.base,
      this.world,
      this.block,
    ) as DisplayBlockTile;

    if (!this.peer.canAddItemToInv(itemMeta.id!)) {
      this.peer.sendTextBubble(
        "You don't have enough space in your backpack! Free some and try again.",
        true,
      );
      return;
    }

    this.peer.sendTextBubble(
      `You removed \`5${itemMeta!.name!}\`\` from the Display Block.`,
      false,
    );
    this.peer.addItemInven(itemMeta!.id!);

    this.block.displayBlock = {
      displayedItem: 0,
    };

    this.world.every((p) => dBlock.tileUpdate(p));
  }
}
