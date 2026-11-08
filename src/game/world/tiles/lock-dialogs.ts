import type { TextParser } from "../../../utils/text-parser";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { PlayerDB } from "../../../database/services/player-db";
import { FloodFill } from "../flood-fill";
import { tileFrom } from "./index";
import type { World } from "../world";
import type { LockParent, TileData } from "../types";
import { ActionTypes, ITEM_ID, LockPermission, LOCKS, TileFlags } from "../constants";

/** Sound played when a lock is applied. */
const USE_LOCK_SOUND = "audio/use_lock.wav";
/** Prefix of the access-list checkboxes in the `area_lock_edit` dialog. */
const ACCESS_PREFIX = "access_";

/** Admin ids whose `access_<id>` checkbox was unticked. */
function uncheckedAdmins(action: TextParser, lock: LockParent): number[] {
  const removed: number[] = [];
  for (const [key, values] of action.getEntries()) {
    if (!key.startsWith(ACCESS_PREFIX) || values[0] !== "0") continue;
    const playerId = Number.parseInt(key.slice(ACCESS_PREFIX.length), 10);
    if (!Number.isNaN(playerId) && lock.adminIds.includes(playerId)) removed.push(playerId);
  }
  return removed;
}

function broadcastConsole(world: World, message: string): void {
  for (const other of world.players) {
    other.variants.sendOnConsoleMessage(message);
  }
}

/** Grants lock access to the player picked in the dialog's player picker. */
function addAdmin(player: Player, world: World, lock: LockParent, targetNetId: number, lockName: string): void {
  const target = world.players.find((other) => other.netID === targetNetId);
  if (!target) {
    player.sendTextBubble("Oops, it looks like that player has already left the world.", false);
    return;
  }

  if (target.playerId === lock.ownerPlayerId) {
    player.sendTextBubble("I already have access!", false);
    return;
  }

  if (lock.adminIds.includes(target.playerId)) {
    player.sendTextBubble(`${target.displayName} already has access to the lock.`, false);
    return;
  }

  lock.adminIds.push(target.playerId);
  player.sendTextBubble(`Added ${target.displayName} access to lock`, false);
  broadcastConsole(world, `${player.displayName} added ${target.displayName} to a ${lockName}.`);
  target.sendSfx("audio/secret.wav");
}

/** Clears the tiles owned by an area lock and claims them again with the current settings. */
function reapplyLock(player: Player, world: World, block: TileData, lock: LockParent, maxTiles: number): void {
  new FloodFill({
    world,
    lock: block,
    maxTiles,
    ignoreEmptyAir: lock.ignoreEmptyAir,
  })
    .exec()
    .apply(world, player);

  world.playPositioned(USE_LOCK_SOUND, player.netID);
}

registerDialog("area_lock_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  const itemMeta = getItem(block.fg);
  const lock = block.lock;
  if (!lock || itemMeta?.type !== ActionTypes.LOCK) return;
  if (lock.ownerPlayerId !== player.playerId && !player.isDeveloper) return;

  const lockMeta = LOCKS.find((l) => l.id === block.fg);
  const lockName = itemMeta.name ?? "lock";

  if (action.get("allow_break_build") === "1") block.flags |= TileFlags.PUBLIC;
  else block.flags &= ~TileFlags.PUBLIC;

  if (block.worldLockData) {
    const worldLock = block.worldLockData;
    worldLock.customMusicBlocksDisabled = action.get("disable_music") === "1";
    worldLock.invisMusicBlocks = action.get("invisible_music") === "1";
    if (action.contains("tempo")) worldLock.bpm = Math.max(20, Math.min(200, action.getInt("tempo", 0, worldLock.bpm)));
    if (action.contains("minimum_level")) worldLock.minLevel = Math.max(1, action.getInt("minimum_level", 0, worldLock.minLevel));
  } else {
    lock.ignoreEmptyAir = action.get("ignore_empty") === "1";
    if (block.fg === ITEM_ID.BUILDERS_LOCK) {
      lock.permission = action.get("build_only") === "1" ? LockPermission.BUILD : (lockMeta?.defaultPermission ?? LockPermission.NONE);
      lock.adminLimited = action.get("limit_admin") === "1";
    }
  }

  const pickedNetId = action.getInt("playerNetID", 0, -1);
  if (action.get("buttonClicked") === "reapply_lock" && lockMeta && !block.worldLockData) {
    reapplyLock(player, world, block, lock, lockMeta.maxTiles);
  } else if (pickedNetId >= 0 && action.get("playerNetID") !== "") {
    addAdmin(player, world, lock, pickedNetId, lockName);
  }

  for (const removedId of uncheckedAdmins(action, lock)) {
    const index = lock.adminIds.indexOf(removedId);
    if (index === -1) continue;
    lock.adminIds.splice(index, 1);

    const removed = await PlayerDB.getById(removedId);
    broadcastConsole(world, `${removed?.display_name ?? removed?.name ?? "A player"} was removed from a ${lockName}`);
  }

  tileFrom(world, block).tileUpdate();
  world.markDirty();
});

registerDialog("revoke_lock_access", (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  const itemMeta = getItem(block.fg);
  const lock = block.lock;
  if (!lock || itemMeta?.type !== ActionTypes.LOCK) return;
  // the owner cannot revoke their own access
  if (lock.ownerPlayerId === player.playerId) return;

  const index = lock.adminIds.indexOf(player.playerId);
  if (index === -1) return;
  lock.adminIds.splice(index, 1);

  broadcastConsole(world, `${player.displayName} removed their access from a ${itemMeta.name}`);

  tileFrom(world, block).tileUpdate();
  world.markDirty();
});
