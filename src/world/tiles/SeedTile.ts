// import { ItemDefinition, Variant } from "growtopia.js";
// import { TileExtraTypes, TileFlags } from "../../Constants";
// import type { Base } from "../../core/Base";
// import type { World } from "../../core/World";
// import type { TileData } from "../../types";
// import { ExtendBuffer } from "../../utils/ExtendBuffer";
// import { Tile } from "../Tile";
// import { Peer } from "../../core/Peer";

// export class SeedTile extends Tile {
//   public extraType = TileExtraTypes.SEED;

//   constructor(
//     public base: Base,
//     public world: World,
//     public data: TileData,
//     public fgItemMeta: ItemDefinition,
//   ) {
//     super(base, world, data, fgItemMeta);
//   }

//   public async onPlace(peer: Peer): Promise<void> {
//     this.initializeTreeData(this.fgItemMeta);
//     super.onPlace(peer);
//   }

//   public async onItemPlace(peer: Peer, item: ItemDefinition): Promise<void> {
//     if (Date.now() >= this.data.tree!.fullyGrownAt) {
//       this.notifySplicingMatureTree(peer);
//       return;
//     }

//     if (this.data.tree!.isSpliced) {
//       this.notifySplicing3Seeds(peer);
//       return;
//     }

//     this.base.items.wiki.forEach((itemWiki) => {
//       if (itemWiki.recipe && itemWiki.recipe.splice.length == 2) {
//         if (itemWiki.recipe.splice.includes(item.id!) && itemWiki.recipe.splice.includes(this.fgItemMeta.id!)) {
//           this.initializeTreeData(this.base.items.metadata.items[itemWiki.id]);
//           this.tileUpdate(peer);
//           this.notifySuccessfulSplice(peer, item.id!, itemWiki.id);
//           return;
//         }
//       }
//     })

//     this.notifyFailedSplice(peer, item.id!);
//   }

//   public async onPunch(peer: Peer): Promise<void> {
//     this.world.drop(
//       peer,
//       this.data.x * 32 + Math.floor(Math.random() * 16),
//       this.data.y * 32 + Math.floor(Math.random() * 16),
//       this.data.tree.fruit,
//       block.tree.fruitCount,
//       { tree: true }
//     );

//     block.tree = undefined;
//     block.fg = 0x0;

//     peer.every(
//       (p) =>
//         p.data?.world === peer.data?.world &&
//         p.data?.world !== "EXIT" &&
//         p.send(
//           TankPacket.from({
//             type: TankTypes.SEND_TILE_TREE_STATE,
//             netID: peer.data?.netID,
//             targetNetID: -1,
//             xPunch: block.x,
//             yPunch: block.y
//           })
//         )
//     );
//   }

//   public onDestroy(peer: Peer): Promise<void> {
    
//   }

//   public async serialize(): Promise<void> {
//     this.data.writeU8(this.extraType);
//     this.data.writeU32(
//       Math.floor((Date.now() - (this.block.tree?.plantedAt as number)) / 1000)
//     );
//     this.data.writeU8(
//       (this.block.tree?.fruitCount as number) > 4
//         ? 4
//         : (this.block.tree?.fruitCount as number)
//     );

//     return;
//   }

//   private initializeTreeData(seed: ItemDefinition) {
//     this.data.flags |= TileFlags.TILEEXTRA;
//     const fruitCount =
//       Math.floor(Math.random() * 10 * (1 - (seed.rarity || 0) / 1000)) + 1;
//     const now = Date.now();

//     this.data.tree = {
//       fruit: seed.id! - 1,
//       fruitCount,
//       fullyGrownAt: (this.data.tree?.plantedAt ?? now) + (seed.growTime || 0) * 1000,
//       plantedAt: now,
//       isSpliced: false
//     }
//     this.data.flags |= TileFlags.SEED;
//   }

//   private deinitializeTreeData() {
//     this.data.flags &= ~(TileFlags.TILEEXTRA | TileFlags.SEED); // unset TILEEXTRA and SEED
//     this.data.tree = undefined;
//   }

//   private notifySuccessfulSplice(peer: Peer, seed2Id: number, spliceResultSeedId: number) {
//     const seed1Name = this.fgItemMeta.name;
//     const seed2Name = this.base.items.metadata.items[seed2Id].name;
//     // the block name
//     const spliceBlockName = this.base.items.metadata.items[spliceResultSeedId - 1].name;

//     peer.send(
//       Variant.from(
//         "OnTalkBubble",
//         peer.data.netID,
//         `${seed1Name} and ${seed2Name} have been spliced to make an \`o${spliceBlockName} Tree\`0!`,
//         0
//       )
//     );

//     peer.every((p) => {
//       if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT")
//         p.send(
//           Variant.from(
//             { netID: peer.data?.netID },
//             "OnPlayPositioned",
//             "audio/success.wav"
//           )
//         );
//     });
//   }

//   private notifyFailedSplice(peer: Peer, seed2Id: number) {
//     const seed1Name = this.fgItemMeta.name;
//     const seed2Name = this.base.items.metadata.items[seed2Id].name;

//     peer.send(
//       // stacking talk bubble didnt work :(
//       Variant.from(
//         "OnTalkBubble",
//         peer.data.netID,
//         `Hmm, it looks like ${seed1Name} and ${seed2Name} can't be spliced.`,
//         1
//       )
//     );
//   }

//   private notifySplicing3Seeds(peer: Peer) {
//     peer.send(
//       Variant.from(
//         "OnTalkBubble",
//         peer.data.netID,
//         "it would be too dangerous to try to mix three seeds.",
//         1
//       )
//     );
//   }

//   private notifySplicingMatureTree(peer: Peer) {
//     peer.send(
//       Variant.from(
//         "OnTalkBubble",
//         peer.data.netID,
//         "This tree is already too big to splice another seed with.",
//         1
//       )
//     );
//   }
// }
