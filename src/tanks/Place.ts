import { TankPacket } from "growsockets";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { handleBlockPlacing } from "./BlockPlacing";

/** Handle Place */
export function handlePlace(tank: TankPacket, peer: Peer, base: BaseServer, world: World): void {
  const tankData = tank.data!;
  const pos = tankData.xPunch! + tankData.yPunch! * world.data.width!;
  const block = world.data.blocks![pos];
  //prettier-ignore
  const isBg = base.items.metadata.items[tankData.info!].type === ActionTypes.BACKGROUND || base.items.metadata.items[tankData.info!].type === ActionTypes.SHEET_MUSIC;
  const placedItem = base.items.metadata.items.find((i) => i.id === tank.data?.info);

  if (!placedItem || !placedItem.id) return;
  if (tankData.info === 18 || tankData.info === 32) return;

  // tankData.netID = peer.data.netID;
  // tankData.type = TankTypes.TILE_PUNCH;

  handleBlockPlacing({
    actionType: placedItem.type!,
    peer,
    world,
    block,
    id: placedItem.id,
    isBg,
    base
  });

  // prettier-ignore
  let invenItem = peer.data.inventory?.items.find((item) => item.id === tank.data?.info)!;
  invenItem.amount = invenItem.amount! - 1;

  // Check if inventory amount is empty, then delete it.
  if (invenItem.amount <= 0) {
    // prettier-ignore
    peer.data.inventory!.items! = peer.data.inventory?.items.filter((i) => i.amount !== 0)!;
  }

  world.saveToCache();
  peer.saveToCache();
  return;
}
