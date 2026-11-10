import { Collection } from "../../utils/collection";
import { TANK_PACKET_TYPE } from "../../constants";
import { getItem } from "../item/item-utils";
import { GameUpdatePacket } from "../packets/game-packet";
import type { Player } from "../player";
import { Variant } from "../packets/variants";
import { ActionTypes, BlockFlags, ITEM_ID } from "./constants";
import { isPlaceableType, tileFrom } from "./tiles";
import type { TileData } from "./types";
import type { World } from "./world";

export const MAGPLANT_CAPACITY = 5000;
interface RemoteBinding { world: World; block: TileData; state: NonNullable<TileData["magplant"]>; }
const remotes = new Collection<Player, RemoteBinding>();

/** Only the world owner and staff may configure or withdraw storage. */
export function canManageMagplant(player: Player, world: World): boolean {
  return world.getOwnerPlayerId() !== undefined && (player.isDeveloper || world.getOwnerPlayerId() === player.playerId);
}

/** Remote access is distinct from permission to configure storage. */
export function canUseMagplantRemote(player: Player, world: World, block: TileData): boolean {
  return world.getOwnerPlayerId() !== undefined && !!block.magplant && isMagplantPlantable(block.magplant.itemId)
    && (canManageMagplant(player, world) || block.magplant.planting === true);
}

/** Filters remote targets through the normal placement handlers and reference rarity restrictions. */
export function isMagplantPlantable(itemId: number): boolean {
  const item = getItem(itemId);
  if (!item || itemId === ITEM_ID.GEMS || item.rarity === 999 || ((item.flags ?? 0) & BlockFlags.AUTO_PICKUP)) return false;
  const type = item.type ?? ActionTypes.FOREGROUND;
  return isPlaceableType(type) && ![ActionTypes.CONSUMABLE, ActionTypes.ITEM_PLANTER, ActionTypes.PETFISH].includes(type);
}

/** Revokes a transient remote and removes its untradeable inventory token. */
export function clearMagplantRemote(player: Player): void {
  const connected = remotes.delete(player);
  const amount = player.inventory.getAmount(ITEM_ID.MAGPLANT_REMOTE);
  if (amount > 0) player.removeItemInven(ITEM_ID.MAGPLANT_REMOTE, amount);
  if (connected || amount > 0) player.variants.sendVariant(Variant.from("OnPlanterActivated", 0, 0, 0));
}

/** Periodically removes remotes whose machine, World Lock, or access is no longer valid. */
export function tickMagplantRemotes(): void {
  for (const [player, binding] of remotes) {
    if (player.world !== binding.world || binding.world.getTileAt(binding.block.x, binding.block.y) !== binding.block
      || binding.block.magplant !== binding.state || binding.block.fg !== ITEM_ID.MAGPLANT
      || !canUseMagplantRemote(player, binding.world, binding.block)) clearMagplantRemote(player);
  }
}

/** Invalidates remote bindings when a machine's modes, stock selection, or existence change. */
export function invalidateMagplantRemotes(block: TileData): void {
  for (const [player, binding] of remotes) if (binding.block === block) clearMagplantRemote(player);
}

/** Issues a remote bound to this exact in-memory machine instance. */
export function bindMagplantRemote(player: Player, world: World, block: TileData): boolean {
  if (player.world !== world || !block.magplant || !canUseMagplantRemote(player, world, block)) return false;
  if (!player.inventory.hasItem(ITEM_ID.MAGPLANT_REMOTE) && player.addItemInven(ITEM_ID.MAGPLANT_REMOTE, 1) !== 1) return false;
  remotes.set(player, { world, block, state: block.magplant });
  player.variants.sendVariant(Variant.from("OnPlanterActivated", block.magplant.itemId, block.x, block.y));
  player.sendTextBubble("MAGPLANT remote connected. Select it to place stored items.", true);
  return true;
}

/** Intercepts only new block/harvest drops; returns the amount left to drop normally. */
export function collectMagplantDrop(world: World, itemId: number, amount: number, source?: { x: number; y: number }): number {
  if (world.getOwnerPlayerId() === undefined || amount <= 0) return amount;
  let remaining = amount;
  // Block-array order is stable across saves and resolves multiple matching machines.
  for (const block of world.data.blocks) {
    const state = block.magplant;
    if (block.fg !== ITEM_ID.MAGPLANT || !state || state.collecting === false || state.itemId !== itemId || itemId === ITEM_ID.GEMS) continue;
    const capacity = MAGPLANT_CAPACITY;
    const taken = Math.min(remaining, Math.max(0, capacity - state.count));
    if (taken <= 0) continue;
    state.count += taken;
    remaining -= taken;
    // V8 use_mag animates subtype 6 from the broken tile into machine storage.
    if (source) world.broadcast(GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.ITEM_EFFECT, buildRange: 6, netID: -1, tileX: itemId,
      posX: block.x * 32 + 16, posY: block.y * 32 + 16,
      speedX: Math.floor(source.x / 32) * 32 + 16, speedY: Math.floor(source.y / 32) * 32 + 16,
    }).parse()!);
    world.markDirty();
    tileFrom(world, block).tileUpdate();
    if (remaining === 0) break;
  }
  return remaining;
}

/** Places from storage through the normal tile handler without a temporary inventory credit. */
export async function placeWithMagplantRemote(player: Player, world: World, target: TileData): Promise<void> {
  const binding = remotes.get(player);
  if (!binding || binding.world !== world || player.world !== world || binding.block.magplant !== binding.state
    || world.getTileAt(binding.block.x, binding.block.y) !== binding.block
    || binding.block.fg !== ITEM_ID.MAGPLANT || !canUseMagplantRemote(player, world, binding.block)) {
    clearMagplantRemote(player);
    player.sendTextBubble("Wrench a MAGPLANT to get a connected remote.", true);
    return;
  }
  const state = binding.state;
  if (!state.planting) { player.sendTextBubble("The MAGPLANT's building mode is disabled!", true); return; }
  const item = getItem(state.itemId);
  if (!item || state.count <= 0) { player.sendTextBubble("The MAGPLANT is empty!", true); return; }
  const type = item.type ?? ActionTypes.FOREGROUND;
  if (!isPlaceableType(type) || [ActionTypes.CONSUMABLE, ActionTypes.ITEM_PLANTER, ActionTypes.PETFISH].includes(type)) return;
  const background = type === ActionTypes.BACKGROUND;
  if (background ? target.bg !== 0 : target.fg !== 0) return;
  const fg = target.fg, bg = target.bg;
  const selected = state.itemId;
  const available = () => remotes.get(player) === binding && player.world === world && binding.block.magplant === state
    && world.getTileAt(binding.block.x, binding.block.y) === binding.block
    && binding.block.fg === ITEM_ID.MAGPLANT && canUseMagplantRemote(player, world, binding.block)
    && state.planting === true && state.itemId === selected && state.count > 0 && target.fg === fg && target.bg === bg
    && world.getTileAt(target.x, target.y) === target;
  const tile = tileFrom(world, target, background ? undefined : type, background ? undefined : item.id);
  tile.placementSource = { available, consume: () => {
    if (!available()) return false;
    state.count--;
    world.markDirty();
    return true;
  } };
  const placed = background ? await tile.onPlaceBackground(player, item) : await tile.onPlaceForeground(player, item);
  if (placed) {
    world.markDirty();
    tileFrom(world, binding.block).tileUpdate();
    player.sendInventory();
  }
}
