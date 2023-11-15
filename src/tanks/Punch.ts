import { TankPacket, Variant } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { Block } from "../types/world";
import { Role } from "../utils/Constants";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { tileUpdate } from "./BlockPlacing";

/** Handle Punch */
export function handlePunch(tank: TankPacket, peer: Peer, base: BaseServer, world: World): void {
  const tankData = tank.data!;
  const pos = tankData.xPunch! + tankData.yPunch! * world.data.width!;
  const block = world.data.blocks![pos];
  const itemMeta = base.items.metadata.items[block.fg || block.bg!];

  if (!itemMeta.id) return;
  if (typeof block.damage !== "number" || block.resetStateAt! <= Date.now()) block.damage = 0;

  if (world.data.owner) {
    if (world.data.owner.id !== peer.data?.id_user) {
      if (peer.data?.role !== Role.DEVELOPER) {
        if (itemMeta.id === 242)
          peer.send(
            Variant.from(
              "OnTalkBubble",
              peer.data?.netID!,
              `\`#[\`0\`9World Locked by ${world.data.owner?.displayName}\`#]`
            )
          );

        return peer.everyPeer((p) => {
          if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT")
            p.send(
              Variant.from(
                { netID: peer.data?.netID },
                "OnPlayPositioned",
                "audio/punch_locked.wav"
              )
            );
        });
      }
    }
  }

  if (itemMeta.id === 8 || itemMeta.id === 6 || itemMeta.id === 3760 || itemMeta.id === 7372) {
    if (peer.data?.role !== Role.DEVELOPER) {
      peer.send(Variant.from("OnTalkBubble", peer.data?.netID!, "It's too strong to break."));
      peer.everyPeer((p) => {
        if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT")
          p.send(
            Variant.from({ netID: peer.data?.netID }, "OnPlayPositioned", "audio/punch_locked.wav")
          );
      });
      return;
    }
  }

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

      case ActionTypes.DEADLY_BLOCK: {
        block.dblockID = undefined;
        break;
      }

      case ActionTypes.HEART_MONITOR: {
        block.heartMonitor = undefined;
        break;
      }

      case ActionTypes.LOCK: {
        // Fix dc sendiri bila menghancurkan wl
        if (itemMeta.id !== 242) return;

        block.worldLock = undefined;
        block.lock = undefined;
        world.data.owner = undefined;

        tileUpdate(base, peer, itemMeta.type, block, world);
        break;
      }
    }
  } else {
    tankData.type = TankTypes.TILE_DAMAGE;
    tankData.info = block.damage + 5;

    block.resetStateAt = Date.now() + itemMeta.resetStateAfter! * 1000;
    block.damage++;

    switch (itemMeta.type) {
      case ActionTypes.SEED: {
        world.harvest(peer, block);
        break;
      }
    }
  }

  peer.send(tank);

  world.saveToCache();

  peer.everyPeer((p) => {
    if (
      p.data?.netID !== peer.data?.netID &&
      p.data?.world === peer.data?.world &&
      p.data?.world !== "EXIT"
    ) {
      p.send(tank);
    }
  });
  return;
}
