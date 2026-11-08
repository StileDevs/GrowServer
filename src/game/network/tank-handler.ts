import { TANK_PACKET_TYPE } from "../../constants";
import { logger } from "../../utils/logger";
import { getItem } from "../item/item-utils";
import type { GameUpdatePacket } from "../packets/game-packet";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { ActionTypes, ITEM_ID } from "../world/constants";
import { isPlaceableType, tileFrom } from "../world/tiles";
import type { World } from "../world/world";
import { worldManager } from "../world/world-manager";

type TankHandler = (player: Player, tank: GameUpdatePacket, world: World) => Promise<void> | void;

/** Player movement and punch/build input. */
function State(player: Player, tank: GameUpdatePacket, world: World): void {
  const data = tank.data;
  data.netID = player.netID;

  player.state.x = data.posX;
  player.state.y = data.posY;
  player.state.rotatedLeft = (data.flags & 0x10) !== 0;

  world.broadcast(tank.parse()!, player.id);

  // tile the player is standing on, only reported when not punching
  if (data.tileX > 0 || data.tileY > 0) return;
  const block = world.getTileAt(Math.floor(data.posX / 32), Math.floor(data.posY / 32));
  if (!block) return;

  const item = getItem(block.fg || block.bg);
  if (item?.type === ActionTypes.CHECKPOINT) {
    const index = block.x + block.y * world.width;
    player.variants.sendVariant(Variant.from({ netID: player.netID, delay: 0 }, "SetRespawnPos", index));
    player.lastCheckpoint = { x: block.x, y: block.y };
  }
}

/**
 * Rayman's Fist punches two more tiles beyond the one hit, continuing in the
 * punch direction: sideways when the target is on the player's row, up or
 * down when it is on the player's column, diagonally otherwise.
 */
async function raymanPunch(player: Player, world: World, data: GameUpdatePacket["data"]): Promise<void> {
  const playerTileX = Math.floor(data.posX / 32);
  const playerTileY = Math.floor(data.posY / 32);
  const facing = player.state.rotatedLeft ? -1 : 1;
  const vertical = data.tileY < playerTileY ? -1 : 1;

  let dx: number;
  let dy: number;
  if (data.tileY === playerTileY) {
    dx = facing;
    dy = 0;
  } else if (data.tileX === playerTileX) {
    dx = 0;
    dy = vertical;
  } else {
    dx = facing;
    dy = vertical;
  }

  for (let step = 1; step <= 2; step++) {
    const block = world.getTileAt(data.tileX + dx * step, data.tileY + dy * step);
    if (!block || (block.fg === 0 && block.bg === 0)) continue;
    await tileFrom(world, block).onPunch(player);
  }
}

/** Punch, wrench or place on a tile. */
async function TileChangeRequest(player: Player, tank: GameUpdatePacket, world: World): Promise<void> {
  const data = tank.data;
  const block = world.getTileAt(data.tileX, data.tileY);
  if (!block) return;

  if (data.itemID === ITEM_ID.FIST) {
    await tileFrom(world, block).onPunch(player);
    if (player.inventory.clothes.hand === ITEM_ID.RAYMANS_FIST) await raymanPunch(player, world, data);
  } else if (data.itemID === ITEM_ID.WRENCH) {
    await tileFrom(world, block).onWrench(player);
  } else {
    const itemMeta = getItem(data.itemID);
    if (!itemMeta) return;
    const type = itemMeta.type ?? ActionTypes.FOREGROUND;

    if (!isPlaceableType(type)) {
      player.sendTextBubble("That item isn't supported on this server yet.");
      return;
    }

    if (type === ActionTypes.BACKGROUND) {
      // keep the current foreground behaviour
      await tileFrom(world, block).onPlaceBackground(player, itemMeta);
    } else if (block.fg === 0) {
      await tileFrom(world, block, type, itemMeta.id).onPlaceForeground(player, itemMeta);
    } else {
      await tileFrom(world, block).onItemPlace(player, itemMeta);
    }
  }

  world.markDirty();
}

/** Door usage. */
async function TileActivateRequest(player: Player, tank: GameUpdatePacket, world: World): Promise<void> {
  const block = world.getTileAt(tank.data.tileX, tank.data.tileY);
  if (!block?.door) return;
  if (block.fg === ITEM_ID.MAIN_DOOR) return player.leaveWorld();

  const [rawWorld, rawId] = (block.door.destination ?? "").split(":");
  const targetWorld = rawWorld?.trim().toUpperCase() || world.name;
  const targetId = rawId?.trim().toUpperCase() ?? "";

  if (targetWorld === "EXIT") return player.leaveWorld();

  if (targetWorld === world.name) {
    const door = (targetId && world.data.blocks.find((b) => b.door?.id?.toUpperCase() === targetId)) || world.mainDoor;
    const x = (door?.x ?? 0) * 32;
    const y = (door?.y ?? 0) * 32;

    player.state.x = x;
    player.state.y = y;
    player.variants.sendOnZoomCamera(10000, 1000);
    for (const other of world.players) {
      other.variants.sendOnSetFreezeState(player.netID, false);
      other.variants.sendOnSetPos(player.netID, x, y);
      other.variants.sendOnPlayPositioned("audio/door_open.wav", player.netID);
    }
    return;
  }

  const destination = await worldManager.get(targetWorld);
  const door = (targetId && destination.data.blocks.find((b) => b.door?.id?.toUpperCase() === targetId)) || destination.mainDoor;
  await player.enterWorld(targetWorld, door?.x, door?.y);
}

/** Picking up a dropped item. */
function ItemActivateObjectRequest(player: Player, tank: GameUpdatePacket, world: World): void {
  if (player.state.isGhost) return;
  world.collect(player, tank.data.itemID);
}

/** Using an item from the backpack: wear clothes, convert locks. */
async function ItemActivateRequest(player: Player, tank: GameUpdatePacket): Promise<void> {
  const itemId = tank.data.itemID;
  const item = getItem(itemId);
  if (!item || !player.inventory.hasItem(itemId)) return;

  if (item.type === ActionTypes.LOCK) {
    const convert = (from: number, fromAmount: number, to: number, toAmount: number, message: string, tooMany: string) => {
      if (player.inventory.getAmount(from) < fromAmount) return;
      if (player.inventory.getAmount(to) + toAmount > 200) {
        player.sendTextBubble(tooMany);
        return;
      }
      player.removeItemInven(from, fromAmount);
      player.addItemInven(to, toAmount);
      player.sendTextBubble(message);
    };

    switch (itemId) {
      case ITEM_ID.BLUE_GEM_LOCK:
        convert(ITEM_ID.BLUE_GEM_LOCK, 1, ITEM_ID.DIAMOND_LOCK, 100, "You shattered a Blue Gem Lock into 100 Diamond Locks!", "Whoops, you're holding too many Diamond Locks!");
        break;
      case ITEM_ID.DIAMOND_LOCK:
        convert(ITEM_ID.DIAMOND_LOCK, 1, ITEM_ID.WORLD_LOCK, 100, "You shattered a Diamond Lock into 100 World Locks!", "Whoops, you're holding too many World Locks!");
        break;
      case ITEM_ID.WORLD_LOCK:
        convert(ITEM_ID.WORLD_LOCK, 100, ITEM_ID.DIAMOND_LOCK, 1, "You compressed 100 World Locks into a Diamond Lock!", "Whoops, you're holding too many Diamond Locks!");
        break;
    }
    await player.saveToDatabase();
    return;
  }

  if (item.type === ActionTypes.CLOTHES || item.type === ActionTypes.ANCES) {
    player.equipClothes(itemId);
  }
}

/** Selected item in the hotbar changed; relay to the world. */
function SetIconState(player: Player, tank: GameUpdatePacket, world: World): void {
  tank.data.netID = player.netID;
  tank.data.flags = player.state.rotatedLeft ? 16 : 0;
  world.broadcast(tank.parse()!, player.id);
}

const TankMap: Partial<Record<number, TankHandler>> = {
  [TANK_PACKET_TYPE.STATE]: State,
  [TANK_PACKET_TYPE.TILE_CHANGE_REQUEST]: TileChangeRequest,
  [TANK_PACKET_TYPE.TILE_ACTIVATE_REQUEST]: TileActivateRequest,
  [TANK_PACKET_TYPE.ITEM_ACTIVATE_OBJECT_REQUEST]: ItemActivateObjectRequest,
  [TANK_PACKET_TYPE.ITEM_ACTIVATE_REQUEST]: ItemActivateRequest,
  [TANK_PACKET_TYPE.SET_ICON_STATE]: SetIconState,
};

/**
 * Dispatches an incoming GAME_PACKET to its handler. Everything except
 * DISCONNECT requires the player to be inside a world.
 */
export async function handleTankPacket(player: Player, tank: GameUpdatePacket): Promise<void> {
  if (tank.data.type === TANK_PACKET_TYPE.DISCONNECT) {
    player.disconnectNow();
    return;
  }

  const world = player.world;
  if (!world) return;

  const handler = TankMap[tank.data.type];
  if (!handler) return;

  try {
    await handler(player, tank, world);
  } catch (err) {
    logger.error({ err, type: TANK_PACKET_TYPE[tank.data.type], player: player.tankIDName }, "failed to handle game packet");
  }
}
