import { TankPacket, Variant } from "growtopia.js";
import {
  LockPermission,
  TankTypes,
  TileExtraTypes,
  TileFlags,
} from "@growserver/const";
import type { Base } from "../../core/Base";
import type { World } from "../../core/World";
import type { TileData } from "@growserver/types";
import { ExtendBuffer } from "@growserver/utils";
import { Tile } from "../Tile";
import { Peer } from "../../core/Peer";
import { ItemDefinition } from "grow-items";

export class SeedTile extends Tile {
  public extraType = TileExtraTypes.SEED;

  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
  }

  public async onPlaceForeground(
    peer: Peer,
    itemMeta: ItemDefinition,
  ): Promise<boolean> {
    if (!(await super.onPlaceForeground(peer, itemMeta))) {
      return false;
    }

    this.initializeTreeData(itemMeta);
    // actually, this is not nescessary. But since i have yet to figure out a way to set a field in the TileChangeReq packet
    //  - Badewen
    this.world.every((p) => this.tileUpdate(p));
    return true;
  }

  public async onItemPlace(peer: Peer, item: ItemDefinition): Promise<boolean> {
    if (!(await super.onItemPlace(peer, item))) {
      return false;
    }

    // Ensure player actually has the seed being used to splice
    if (!peer.searchItem(item.id!)) {
      return false;
    }

    if (Date.now() >= this.data.tree!.fullyGrownAt) {
      this.notifySplicingMatureTree(peer);
      return false;
    }

    if (this.data.tree!.isSpliced) {
      this.notifySplicing3Seeds(peer);
      return false;
    }

    const currentSeedMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    )!;

    let spliceSuccessful = false;

    if (item.id! != this.data.fg) {
      this.base.items.wiki.every((itemWiki) => {
        if (itemWiki.recipe && itemWiki.recipe.splice.length == 2) {
          if (
            itemWiki.recipe.splice.includes(item.id! - 1) &&
            itemWiki.recipe.splice.includes(this.data.fg! - 1)
          ) {
            const spliceResultSeedMeta = this.base.items.metadata.items.get(
              (itemWiki.id! + 1).toString(),
            )!;
            spliceSuccessful = true;
            this.initializeTreeData(spliceResultSeedMeta);
            this.data.tree!.isSpliced = true;

            this.world.every((p) => {
              this.tileUpdate(p);
            });
            this.notifySuccessfulSplice(
              peer,
              currentSeedMeta.name!,
              item.name!,
              spliceResultSeedMeta.name!,
            );

            // Consume the splicer seed from inventory on successful splice
            peer.removeItemInven(item.id!, 1);

            return false;
          }
        }
        return true;
      });
    }

    if (!spliceSuccessful) {
      this.notifyFailedSplice(peer, currentSeedMeta.name!, item.name!);
      return false;
    }

    return true;
  }

  public async onPunch(peer: Peer): Promise<boolean> {
    if (
      this.data.tree &&
      Date.now() >= this.data.tree.fullyGrownAt &&
      (await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BREAK,
      ))
    ) {
      const itemMeta = this.base.items.metadata.items.get(
        this.data.fg.toString(),
      )!;
      this.dropHarvestGoodies(peer, itemMeta!);

      this.world.every((p) => {
        p.send(
          TankPacket.from({
            type:        TankTypes.SEND_TILE_TREE_STATE,
            netID:       peer.data?.netID,
            targetNetID: -1,
            xPunch:      this.data.x,
            yPunch:      this.data.y,
          }),
        );
      });

      this.data.fg = 0;
      this.data.resetStateAt = 0;
      this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER); // preserve LOCKED and WATER
      return true;
    }
    return super.onPunch(peer);
  }

  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);
    this.deinitializeTreeData();
  }

  public async onDrop(peer: Peer, destroyedItemID: number): Promise<void> {
    // 10%
    if (Math.random() <= 0.1) {
      this.world.drop(
        peer,
        this.data.x * 32 + Math.floor(Math.random() * 16),
        this.data.y * 32 + Math.floor(Math.random() * 16),
        this.data.fg,
        1,
        { tree: true },
      );
    }
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);
    dataBuffer.grow(1 + 4 + 1);
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeU32(
      Math.floor((Date.now() - (this.data.tree?.plantedAt as number)) / 1000),
    );
    dataBuffer.writeU8(
      (this.data.tree?.fruitCount as number) > 4
        ? 4
        : (this.data.tree?.fruitCount as number),
    );

    return;
  }

  private dropHarvestGoodies(peer: Peer, itemMeta: ItemDefinition) {
    this.world.drop(
      peer,
      this.data.x * 32 + Math.floor(Math.random() * 16),
      this.data.y * 32 + Math.floor(Math.random() * 16),
      this.data.tree!.fruit,
      this.data.tree!.fruitCount,
      { tree: true },
    );

    this.calculateAndSpawnGems(peer, itemMeta.rarity!);

    if (Math.random() <= 0.1) {
      this.world.drop(
        peer,
        this.data.x * 32 + Math.floor(Math.random() * 16),
        this.data.y * 32 + Math.floor(Math.random() * 16),
        this.data.fg,
        1,
        { tree: true },
      );
      this.notifySeedFallout(peer, itemMeta.name!);
    }
  }

  private initializeTreeData(seed: ItemDefinition) {
    this.data.flags |= TileFlags.TILEEXTRA | TileFlags.SEED;
    const fruitCount =
      Math.floor(Math.random() * 10 * (1 - (seed.rarity || 0) / 1000)) + 1;
    const now = Date.now();

    this.data.fg = seed.id!;
    this.data.damage = 0;

    this.data.tree = {
      fruit: seed.id! - 1,
      fruitCount,
      fullyGrownAt:
        (this.data.tree?.plantedAt ?? now) + (seed.growTime || 0) * 1000,
      plantedAt: now,
      isSpliced: false,
    };
  }

  private deinitializeTreeData() {
    this.data.flags &= ~(TileFlags.TILEEXTRA | TileFlags.SEED); // unset TILEEXTRA and SEED
    this.data.tree = undefined;
    this.data.damage = 0;
  }

  private async notifySeedFallout(peer: Peer, seedName: string): Promise<void> {
    peer.send(
      Variant.from(
        { netID: -1 },
        "OnTalkBubble",
        peer.data.netID,
        `A \`w${seedName}\`\` falls out!`,
        0,
        1,
      ),
    );
  }

  private notifySuccessfulSplice(
    peer: Peer,
    seed1Name: string,
    seed2Name: string,
    spliceResultBlockName: string,
  ) {
    peer.send(
      Variant.from(
        { netID: -1 },
        "OnTalkBubble",
        peer.data.netID,
        `${seed1Name} and ${seed2Name} have been spliced to make an \`o${spliceResultBlockName} Tree\`0!`,
        0,
        1,
      ),
    );

    peer.every((p) => {
      if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT")
        p.send(
          Variant.from(
            { netID: peer.data?.netID },
            "OnPlayPositioned",
            "audio/success.wav",
          ),
        );
    });
  }

  private notifyFailedSplice(peer: Peer, seed1Name: string, seed2Name: string) {
    peer.send(
      // stacking talk bubble didnt work :(
      Variant.from(
        { netID: -1 },
        "OnTalkBubble",
        peer.data.netID,
        `Hmm, it looks like \`w${seed1Name}\`\` and \`w${seed2Name}\`\` can't be spliced.`,
        0,
        1,
      ),
    );
  }

  private notifySplicing3Seeds(peer: Peer) {
    peer.send(
      Variant.from(
        { netID: -1 },
        "OnTalkBubble",
        peer.data.netID,
        "it would be too dangerous to try to mix three seeds.",
        0,
        1,
      ),
    );
  }

  private notifySplicingMatureTree(peer: Peer) {
    peer.send(
      Variant.from(
        { netID: -1 },
        "OnTalkBubble",
        peer.data.netID,
        "This tree is already too big to splice another seed with.",
        0,
        1,
      ),
    );
  }
}
