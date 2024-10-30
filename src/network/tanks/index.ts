import { type NonEmptyObject, type Class } from "type-fest";
import { TankTypes } from "../../Constants.js";
import { TileChangeReq } from "./TileChangeReq.js";
import type { Base } from "../../core/Base.js";
import type { Peer } from "../../core/Peer.js";
import type { World } from "../../core/World.js";
import type { TankPacket } from "growtopia.js";
import consola from "consola";

const TankMap: Record<
  number,
  Class<{
    execute: () => Promise<void>;
  }>
> = {
  [TankTypes.TILE_CHANGE_REQUEST]: TileChangeReq
};

const tankParse = async (base: Base, peer: Peer, tank: TankPacket, world: World) => {
  try {
    const type = tank.data?.type as number;
    let Class = TankMap[type];

    // if (actionType === 13) console.log(Class);
    if (!Class) throw new Error(`No TankPacket class fopund with type ${TankTypes[type]} (${type})`);

    const tnk = new Class(base, peer, tank, world);
    await tnk.execute();
  } catch (e) {
    consola.warn(e);
  }
};
export { TankMap, tankParse };
