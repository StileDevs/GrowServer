import { TankPacket } from "growsockets";
import { ItemDefinition } from "itemsdat/src/Types";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { Block } from "../types/world";
import { TankTypes } from "../utils/enums/TankTypes";

/** Handle Punch */
export function handlePunch(
  tank: TankPacket,
  peer: Peer,
  item: ItemDefinition[],
  world: World
): void {
  const tankData = tank.data!;
  const pos = tankData.xPunch! + tankData.yPunch! * world.data.width!;
  const block = world.data.blocks![pos];
  const itemMeta = item[block.fg || block.bg!];

  if (!itemMeta.id) return;
  if (typeof block.damage !== "number" || block.resetStateAt! <= Date.now()) block.damage = 0;

  if (block.damage >= itemMeta.breakHits!) {
    block.damage = 0;
    block.resetStateAt = 0;

    if (block.fg) block.fg = 0;
    else if (block.bg) block.bg = 0;

    tankData.type = TankTypes.TILE_PUNCH;
    tankData.info = 18;
  } else {
    tankData.type = TankTypes.TILE_DAMAGE;
    tankData.info = block.damage + 5;

    block.resetStateAt = Date.now() + itemMeta.resetStateAfter! * 1000;
    block.damage++;
  }

  peer.send(tank);

  world.saveToCache();
  return;
}
