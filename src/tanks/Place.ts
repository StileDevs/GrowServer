import { TankPacket, Variant } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { Role } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { handleBlockPlacing, tileUpdate } from "./BlockPlacing";

/** Handle Place */
export function handlePlace(tank: TankPacket, peer: Peer, base: BaseServer, world: World): void {
  const tankData = tank.data!;
  const pos = tankData.xPunch! + tankData.yPunch! * world.data.width!;
  const block = world.data.blocks![pos];
  //prettier-ignore
  const isBg = base.items.metadata.items[tankData.info!].type === ActionTypes.BACKGROUND || base.items.metadata.items[tankData.info!].type === ActionTypes.SHEET_MUSIC;
  const placedItem = base.items.metadata.items.find((i) => i.id === tank.data?.info);
  const mLock = base.locks.find((l) => l.id === placedItem?.id);
  const mainLock = block.lock
    ? world.data.blocks![block.lock.ownerX! + block.lock.ownerY! * world.data.width!]
    : null;

  if (!placedItem || !placedItem.id) return;
  if (tankData.info === 18 || tankData.info === 32) return;

  if (world.data.owner) {
    // if (placedItem.id === 242 || placedItem.id === 4802) return;
    if (!mLock && placedItem.type === ActionTypes.LOCK)
      return peer.send(
        Variant.from("OnTalkBubble", peer.data?.netID!, `Uhh, world already locked.`, 0, 1)
      );
    if (world.data.owner.id !== peer.data?.id_user) {
      if (peer.data?.role !== Role.DEVELOPER) {
        return peer.send(
          Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav")
        );
      }
    }
  } else {
    if (peer.data?.role !== Role.DEVELOPER) {
      if (mainLock && mainLock.lock?.ownerUserID !== peer.data?.id_user) {
        return peer.send(
          Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav")
        );
      }
    }
  }

  if (
    placedItem.id === 8 ||
    placedItem.id === 6 ||
    placedItem.id === 1000 ||
    placedItem.id === 3760 ||
    placedItem.id === 7372
  ) {
    if (peer.data?.role !== Role.DEVELOPER) {
      return peer.send(
        Variant.from("OnTalkBubble", peer.data?.netID!, "Can't place that block."),
        Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav")
      );
    }
  }

  if (block.fg === 2946) {
    block.dblockID = placedItem.id;
    if (placedItem.collisionType === 1) {
      removeItem(peer, tank, true);
      return tileUpdate(base, peer, ActionTypes.DISPLAY_BLOCK, block, world);
    }
    tileUpdate(base, peer, ActionTypes.DISPLAY_BLOCK, block, world);
  }

  const placed = handleBlockPlacing({
    actionType: placedItem.type!,
    flags: placedItem.flags!,
    peer,
    world,
    block,
    id: placedItem.id,
    isBg,
    base
  });

  removeItem(peer, tank, placed);
  world.saveToCache();
  peer.saveToCache();
  return;
}

function removeItem(peer: Peer, tank: TankPacket, placed: boolean) {
  // prettier-ignore
  let invenItem = peer.data?.inventory?.items.find((item) => item.id === tank.data?.info)!;
  if (placed) invenItem.amount = invenItem.amount! - 1;

  // Check if inventory amount is empty, then delete it.
  if (invenItem.amount <= 0) {
    // prettier-ignore
    peer.data!.inventory!.items! = peer.data?.inventory?.items.filter((i) => i.amount !== 0)!;
  }
  peer.inventory();
}
