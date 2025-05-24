// import { ItemDefinition } from "growtopia.js";
// import { TileExtraTypes, TileFlags } from "../../Constants";
// import type { Base } from "../../core/Base";
// import type { World } from "../../core/World";
// import type { TileData } from "../../types";
// import { ExtendBuffer } from "../../utils/ExtendBuffer";
// import { Tile } from "../Tile";
// import { Peer } from "../../core/Peer";

// export class SignTile extends Tile {
//   public extraType = TileExtraTypes.SIGN;

//   constructor(
//     public base: Base,
//     public world: World,
//     public data: TileData,
//     public fgItemMeta: ItemDefinition,
//   ) {
//     super(base, world, data, fgItemMeta);
//   }

//   public async onPlace(peer: Peer): Promise<void> {
//     this.data.flags |= TileFlags.TILEEXTRA;
//     this.data.sign = { label: "" };
//     super.onPlace(peer);
//   }

//   public async onDestroy(peer: Peer): Promise<void> {
//     this.data.sign = undefined;
//     super.onDestroy(peer);
//   }

//   public async onWrench(peer: Peer): Promise<void> {
//     super.onWrench(peer);
//     // TODO: implement Sign wrenching
//   }

//   public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
//     super.serialize(dataBuffer);
//     dataBuffer.writeU8(this.extraType);
//     dataBuffer.writeString(this.data.sign?.label || "");
//     dataBuffer.writeI32(0xFF);
//   }

// }
