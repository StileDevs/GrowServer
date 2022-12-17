import { TankPacket } from "growsockets";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { Block } from "../types/world";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";

/** Handle Punch */
export function handlePunch(tank: TankPacket, peer: Peer, base: BaseServer, world: World): void {
  const tankData = tank.data!;
  const pos = tankData.xPunch! + tankData.yPunch! * world.data.width!;
  const block = world.data.blocks![pos];
  const itemMeta = base.items.metadata.items[block.fg || block.bg!];

  if (!itemMeta.id) return;
  if (typeof block.damage !== "number" || block.resetStateAt! <= Date.now()) block.damage = 0;

  if (block.damage >= itemMeta.breakHits!) {
    block.damage = 0;
    block.resetStateAt = 0;

    if (block.fg) block.fg = 0;
    else if (block.bg) block.bg = 0;

    tankData.type = TankTypes.TILE_PUNCH;
    tankData.info = 18;

    block.rotatedLeft = undefined;

    switch (itemMeta.type) {
      case ActionTypes.PORTAL:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        block.door = undefined;
        break;
      }

      case ActionTypes.SIGN: {
        block.sign = undefined;
        break;
      }

      case ActionTypes.HEART_MONITOR: {
        block.heartMonitor = undefined;
        break;
      }
    }
  } else {
    tankData.type = TankTypes.TILE_DAMAGE;
    tankData.info = block.damage + 5;

    block.resetStateAt = Date.now() + itemMeta.resetStateAfter! * 1000;
    block.damage++;
  }

  peer.send(tank);

  world.saveToCache();

  peer.everyPeer((p) => {
    if (
      p.data.netID !== peer.data.netID &&
      p.data.world === peer.data.world &&
      p.data.world !== "EXIT"
    ) {
      p.send(tank);
    }
  });
  return;
}
