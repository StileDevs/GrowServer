import { Tank, TankPacket, Variant } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { Role } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { handleBlockPlacing, tileUpdate } from "./BlockPlacing";

/** Handle Place */
export function handlePlace(tank: TankPacket, peer: Peer, base: BaseServer, world: World): void {
  const tankData = tank.data as Tank;
  const pos = (tankData.xPunch as number) + (tankData.yPunch as number) * world.data.width;
  const block = world.data.blocks[pos];
  //prettier-ignore
  const isBg = base.items.metadata.items[tankData.info as number].type === ActionTypes.BACKGROUND || base.items.metadata.items[tankData.info as number].type === ActionTypes.SHEET_MUSIC;
  const placedItem = base.items.metadata.items.find((i) => i.id === tank.data?.info);
  const mLock = base.locks.find((l) => l.id === placedItem?.id);
  const mainLock = block.lock ? world.data.blocks[(block.lock.ownerX as number) + (block.lock.ownerY as number) * world.data.width] : null;

  if (!placedItem || !placedItem.id) return;
  if (tankData.info === 18 || tankData.info === 32) return;

  if (world.data.owner) {
    // if (placedItem.id === 242 || placedItem.id === 4802) return;
    if (!mLock && placedItem.type === ActionTypes.LOCK) {
      peer.send(Variant.from("OnTalkBubble", peer.data.netID, "Uhh, world already locked.", 0, 1));
      return;
    }
    if (world.data.owner.id !== peer.data?.id_user) {
      if (peer.data?.role !== Role.DEVELOPER) {
        peer.send(Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
        return;
      }
    }
  } else {
    if (peer.data?.role !== Role.DEVELOPER) {
      if (mainLock && mainLock.lock?.ownerUserID !== peer.data?.id_user) {
        peer.send(Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
        return;
      }
    }
  }

  if (placedItem.id === 8 || placedItem.id === 6 || placedItem.id === 1000 || placedItem.id === 3760 || placedItem.id === 7372) {
    if (peer.data?.role !== Role.DEVELOPER) {
      peer.send(Variant.from("OnTalkBubble", peer.data.netID, "Can't place that block."), Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav"));
      return;
    }
  }

  if (block.fg === 2946) {
    block.dblockID = placedItem.id;
    if (placedItem.collisionType === 1) {
      peer.removeItemInven(tank.data?.info as number);
      tileUpdate(base, peer, ActionTypes.DISPLAY_BLOCK, block, world);
      return;
    }
    tileUpdate(base, peer, ActionTypes.DISPLAY_BLOCK, block, world);
  }

  const placed = handleBlockPlacing({
    actionType: placedItem.type as number,
    flags: placedItem.flags as number,
    peer,
    world,
    block,
    id: placedItem.id,
    isBg,
    base
  });

  peer.removeItemInven(tank.data?.info as number);
  world.saveToCache();
  peer.saveToCache();
  return;
}
