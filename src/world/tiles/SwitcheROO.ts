// import { ItemDefinition, TankPacket } from "growtopia.js";
// import { TileFlags } from "../../Constants";
// import type { Base } from "../../core/Base";
// import { Peer } from "../../core/Peer";
// import type { World } from "../../core/World";
// import type { TileData } from "../../types";
// import { ExtendBuffer } from "../../utils/ExtendBuffer";
// import { Tile } from "../Tile";

// export class SwitcheROO extends Tile {
//   constructor(
//     public base: Base,
//     public world: World,
//     public data: TileData,
//     public fgItemMeta: ItemDefinition,
//   ) {
//     super(base, world, data, fgItemMeta);
//   }

//   public async onPunch(peer: Peer): Promise<void> {
//     if (this.world.hasTilePermission(peer.data.userID, this.data)) {
//       // default punch behaviour, but with an exception
//       this.data.flags ^= TileFlags.OPEN;
//     }
//     else {
//       if (this.data.flags & TileFlags.PUBLIC) {
//         this.data.flags ^= TileFlags.OPEN;
//         this.applyDamage(peer, 0);
//       }
//     }

//     super.onPunch(peer);
//   }
// }
