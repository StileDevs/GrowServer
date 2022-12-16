import { TankPacket } from "growsockets";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { HandleTile } from "../structures/TileExtra";
import { World } from "../structures/World";
import { Block } from "../types/world";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";

interface Arg {
  actionType: number;
  peer: Peer;
  world: World;
  block: Block;
  id: number;
  isBg?: boolean;
  base: BaseServer;
}

export function handleBlockPlacing(p: Arg): boolean {
  switch (p.actionType) {
    case ActionTypes.SHEET_MUSIC:
    case ActionTypes.FOREGROUND:
    case ActionTypes.BACKGROUND: {
      p.world.place({
        peer: p.peer,
        x: p.block.x!,
        y: p.block.y!,
        isBg: p.isBg,
        id: p.id
      });

      return true;
      break;
    }

    case ActionTypes.PORTAL:
    case ActionTypes.DOOR:
    case ActionTypes.MAIN_DOOR: {
      p.block.door = { label: "", destination: "", id: "", locked: false };

      p.world.place({
        peer: p.peer,
        x: p.block.x!,
        y: p.block.y!,
        isBg: p.isBg,
        id: p.id
      });

      return true;
      break;
    }

    case ActionTypes.SIGN: {
      p.block.sign = { label: "" };

      p.world.place({
        peer: p.peer,
        x: p.block.x!,
        y: p.block.y!,
        isBg: p.isBg,
        id: p.id
      });

      return true;
      break;
    }

    case ActionTypes.HEART_MONITOR: {
      p.block.heartMonitor = {
        name: p.peer.data.tankIDName,
        user_id: parseInt(p.peer.data.id_user as string)
      };

      p.world.place({
        peer: p.peer,
        x: p.block.x!,
        y: p.block.y!,
        isBg: p.isBg,
        id: p.id
      });

      tileUpdate(p.base, p.peer, p.actionType, p.block);

      return true;
      break;
    }

    default: {
      return false;
      break;
    }
  }
}

export function tileUpdate(base: BaseServer, peer: Peer, actionType: number, block: Block): void {
  peer.everyPeer((p) => {
    if (p.data.world === peer.data.world && p.data.world !== "EXIT") {
      p.send(
        TankPacket.from({
          type: TankTypes.TILE_UPDATE,
          xPunch: block.x,
          yPunch: block.y,
          data: () => HandleTile(base, block, actionType)
        })
      );
    }
  });
}
