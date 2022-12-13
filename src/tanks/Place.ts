import { TankPacket } from "growsockets";
import { ItemDefinition } from "itemsdat/src/Types";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";

/** Handle Place */
export function handlePlace(
  tank: TankPacket,
  peer: Peer,
  item: ItemDefinition[],
  world: World
): void {
  const tankData = tank.data!;
  const pos = tankData.xPunch! + tankData.yPunch! * world.data.width!;
  const block = world.data.blocks![pos];

  //prettier-ignore
  const isBg = item[tankData.info!].type === ActionTypes.BACKGROUND || item[tankData.info!].type === ActionTypes.SHEET_MUSIC;

  if (tankData.info === 18 || tankData.info === 32) return;
  tankData.netID = peer.data.netID;
  tankData.type = TankTypes.TILE_PUNCH;

  peer.send(tank);

  if (isBg) {
    world.data.blocks![pos].bg = tankData.info;
  } else {
    world.data.blocks![pos].fg = tankData.info;
  }

  // prettier-ignore
  let invenItem = peer.data.inventory?.items.find((item) => item.id === tank.data?.info)!;
  invenItem.amount = invenItem.amount! - 1;

  if (invenItem.amount === 0) {
    // prettier-ignore
    peer.data.inventory!.items! = peer.data.inventory?.items.filter((i) => i.amount !== 0)!;
  }
  world.saveToCache();
  peer.saveToCache();
  return;
}
