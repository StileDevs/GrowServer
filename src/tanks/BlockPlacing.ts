import { TankPacket, Variant } from "growtopia.js";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { HandleTile } from "../structures/TileExtra";
import { World } from "../structures/World";
import { Block } from "../types/world";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { Floodfill } from "../structures/FloodFill";
import { BlockFlags } from "../utils/enums/ItemTypes";

interface Arg {
  actionType: number;
  peer: Peer;
  world: World;
  block: Block;
  id: number;
  isBg?: boolean;
  base: BaseServer;
  flags: number;
}

export function handleBlockPlacing(p: Arg): boolean {
  if (p.block.fg === 2946 && p.actionType !== ActionTypes.DISPLAY_BLOCK) return false;

  // prevent replace a block to others
  if (p.block.fg && p.flags & BlockFlags.WRENCHABLE) return false;
  if (p.block.fg && !p.block.bg) return false;
  if (p.block.fg && p.actionType === ActionTypes.PLATFORM) return false;

  switch (p.actionType) {
    case ActionTypes.SHEET_MUSIC:
    case ActionTypes.BEDROCK:
    case ActionTypes.LAVA:
    case ActionTypes.PLATFORM:
    case ActionTypes.FOREGROUND:
    case ActionTypes.BACKGROUND: {
      p.world.place({
        peer: p.peer,
        x: p.block.x!,
        y: p.block.y!,
        isBg: p.isBg,
        id: p.id
      });

      tileVisualUpdate(p.peer, p.block, 0x0, true);
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

      tileUpdate(p.base, p.peer, p.actionType, p.block, p.world);
      return true;
      break;
    }

    case ActionTypes.HEART_MONITOR: {
      p.block.heartMonitor = {
        name: p.peer.data!.tankIDName,
        user_id: parseInt(p.peer.data?.id_user as string)
      };

      p.world.place({
        peer: p.peer,
        x: p.block.x!,
        y: p.block.y!,
        isBg: p.isBg,
        id: p.id
      });

      tileUpdate(p.base, p.peer, p.actionType, p.block, p.world);

      return true;
      break;
    }

    case ActionTypes.LOCK: {
      const mLock = p.base.locks.find((l) => l.id === p.id);
      if (mLock) {
        if (p.block.lock) {
          p.peer.send(
            Variant.from(
              "OnTalkBubble",
              p.peer.data?.netID!,
              "This area is `4already locked``",
              0,
              1
            )
          );
          return false;
        }

        if (
          typeof p.world.data.owner?.id === "number" &&
          p.world.data.owner.id !== p.peer.data?.id_user
        ) {
          p.peer.send(
            Variant.from(
              "OnTalkBubble",
              p.peer.data?.netID!,
              "The tile owner `2allows`` public building but `4not`` for this specific block.",
              0,
              1
            )
          );
          return false;
        }

        p.world.place({
          peer: p.peer,
          x: p.block.x!,
          y: p.block.y!,
          isBg: p.isBg,
          id: p.id
        });

        const algo = new Floodfill({
          s_node: { x: p.block.x!, y: p.block.y! },
          max: mLock.maxTiles,
          width: p.world.data.width!,
          height: p.world.data.height!,
          blocks: p.world.data.blocks!,
          s_block: p.block,
          base: p.base,
          noEmptyAir: false
        });

        algo.exec();
        algo.apply(p.world, p.peer);
        p.peer.send(Variant.from("OnTalkBubble", p.peer.data?.netID!, "Area locked.", 0, 1));

        return true;
      } else {
        if (
          p.world.data.blocks?.find(
            (b) => b.lock && b.lock.ownerUserID && b.lock.ownerUserID !== p.peer.data?.id_user
          )
        ) {
          p.peer.send(
            Variant.from(
              "OnTalkBubble",
              p.peer.data?.netID!,
              `Can't put lock, there's other locks around here.`,
              0,
              1
            )
          );
          return false;
        }

        if (p.block.x === 0 && p.block.y === 0) {
          p.peer.send(
            Variant.from(
              "OnTalkBubble",
              p.peer.data?.netID!,
              "You `4cannot`` place locks over here!",
              0,
              1
            )
          );
          return false;
        }

        p.block.worldLock = true;
        if (!p.block.lock) {
          p.block.lock = {
            ownerUserID: p.peer.data?.id_user as number
          };
        }
        p.world.data.owner = {
          id: p.peer.data?.id_user as number,
          name: p.peer.data?.tankIDName as string,
          displayName: p.peer.name
        };

        p.world.data.bpm = 100;

        p.peer.everyPeer((pa) => {
          if (pa.data?.world === p.peer.data?.world && pa.data?.world !== "EXIT")
            pa.send(
              Variant.from(
                "OnTalkBubble",
                p.peer.data?.netID!,
                `\`3[\`w${p.world.worldName} \`ohas been World Locked by ${p.peer.name}\`3]`
              ),
              Variant.from(
                "OnConsoleMessage",
                `\`3[\`w${p.world.worldName} \`ohas been World Locked by ${p.peer.name}\`3]`
              ),
              Variant.from({ netID: p.peer.data?.netID }, "OnPlayPositioned", "audio/use_lock.wav")
            );
        });

        p.world.place({
          peer: p.peer,
          x: p.block.x!,
          y: p.block.y!,
          isBg: p.isBg,
          id: p.id
        });

        tileUpdate(p.base, p.peer, p.actionType, p.block, p.world);

        return true;
      }

      break;
    }

    case ActionTypes.DISPLAY_BLOCK: {
      p.block.dblockID = 0;

      p.world.place({
        peer: p.peer,
        x: p.block.x!,
        y: p.block.y!,
        isBg: p.isBg,
        id: p.id
      });

      tileUpdate(p.base, p.peer, p.actionType, p.block, p.world);

      return true;
      break;
    }

    case ActionTypes.SEED: {
      if (p.block.fg !== 0) return false;

      const item = p.base.items.metadata.items[p.id];
      const fruitCount = Math.floor(Math.random() * 10 * (1 - item.rarity! / 1000)) + 1;
      const now = Date.now();

      p.block.tree = {
        fruit: p.id - 1,
        fruitCount: fruitCount,
        fullyGrownAt: now + item.growTime! * 1000,
        plantedAt: now
      };

      p.world.place({
        peer: p.peer,
        x: p.block.x!,
        y: p.block.y!,
        id: p.id,
        fruit: fruitCount > 4 ? 4 : fruitCount
      });

      tileUpdate(p.base, p.peer, p.actionType, p.block, p.world);

      return true;
      break;
    }

    default: {
      p.base.log.debug("Unknown block placing", { actionType: p.actionType, block: p.block });
      return false;
      break;
    }
  }
}

export function tileUpdate(
  base: BaseServer,
  peer: Peer,
  actionType: number,
  block: Block,
  world: World
): void {
  peer.everyPeer((p) => {
    if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
      p.send(
        TankPacket.from({
          type: TankTypes.TILE_UPDATE,
          xPunch: block.x,
          yPunch: block.y,
          data: () => HandleTile(base, block, world, actionType)
        })
      );
    }
  });
}

export function tileVisualUpdate(
  peer: Peer,
  block: Block,
  visualFlags: number,
  everyPeer = false
): void {
  let tank = TankPacket.from({
    type: TankTypes.TILE_UPDATE,
    xPunch: block.x,
    yPunch: block.y,
    data: () => {
      let buf = Buffer.alloc(8);

      buf.writeUInt32LE(block.fg! | (block.bg! << 16));
      buf.writeUint16LE(0x0, 4);
      buf.writeUint16LE(visualFlags, 6);

      return buf;
    }
  });

  if (everyPeer) {
    peer.everyPeer((p) => {
      if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
        p.send(tank);
      }
    });
  } else {
    peer.send(tank);
  }
}
