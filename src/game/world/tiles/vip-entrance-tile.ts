import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { DialogBuilder } from "../../../utils/dialog-builder";
import { PlayerDB } from "../../../database/services/player-db";
import { registerDialog, tileFromDialog } from "../../network/dialog-handler";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { Tile } from "../tile";
import type { World } from "../world";
import type { TileData, VipEntrance } from "../types";
import { ActionTypes, TileExtraTypes, TileFlags } from "../constants";
import { canEditEntrance, isInLockedArea, unlockedEntranceDialog } from "./entrance-tile";

/** Prefix of the VIP list checkboxes in the `vip_edit` dialog. */
const VIP_PREFIX = "vip_";

/**
 * VIP Entrance. Extra data: u8 type, u8 public, u32 owner, u32 count,
 * u32 per allowed player id. The client lets a player through when its
 * user id is in the list, so the list is built per serialization from the
 * VIP list, the lock's admins and, when public, everyone in the world.
 */
export class VipEntranceTile extends Tile {
  public extraType = TileExtraTypes.VIP_ENTRANCE;

  /** The VIP list, created on demand. */
  public get vip(): VipEntrance {
    if (!this.data.vip) this.data.vip = { playerIds: [] };
    return this.data.vip;
  }

  public override async onPlaceForeground(player: Player, itemMeta: Parameters<Tile["onPlaceForeground"]>[1]): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;
    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.vip = { playerIds: [] };
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.vip;
  }

  public override async onWrench(player: Player): Promise<boolean> {
    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;

    // the owner edits the entrance; anyone else with access (lock admins,
    // world lock admins, the VIP list itself) gets the revoke dialog
    if (!canEditEntrance(this.world, player, this.data)) {
      if (!this.hasAccess(player)) {
        await this.onPlaceFail(player);
        return false;
      }

      const ownerName = await this.world.getTileOwnerName(this.data);
      const dialog = new DialogBuilder()
        .defaultColor("`o")
        .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id ?? 0, "big")
        .addTextBox(`This ${itemMeta.name} is owned by ${ownerName ?? "someone else"}, but I have access on it.`)
        .embed("tilex", this.data.x)
        .embed("tiley", this.data.y)
        .endDialog("vip_revoke", "Cancel", "Remove My Access");

      player.variants.sendOnDialogRequest(dialog.str());
      return true;
    }

    if (!isInLockedArea(this.world, this.data)) {
      player.variants.sendOnDialogRequest(unlockedEntranceDialog(this.data, itemMeta.name ?? "VIP Entrance", itemMeta.id ?? 0, "vip_edit"));
      return true;
    }

    const dialog = new DialogBuilder()
      .defaultColor("`o")
      .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id ?? 0, "big")
      .addLabel("`wVIP list:``")
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .addSpacer("small");

    if (this.vip.playerIds.length === 0) {
      dialog.addLabel("Nobody!");
    } else {
      for (const playerId of this.vip.playerIds) {
        const record = await PlayerDB.getById(playerId);
        dialog.addCheckbox(`${VIP_PREFIX}${playerId}`, record?.display_name ?? record?.name ?? `#${playerId}`, "selected");
      }
    }

    dialog
      .addSpacer("small")
      .addPlayerPicker("playerNetID", "`wAdd``")
      .addCheckbox("checkbox_public", "Allow anyone to enter", this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected")
      .endDialog("vip_edit", "Cancel", "OK");

    player.variants.sendOnDialogRequest(dialog.str());
    return true;
  }

  /** Whether a player who is not the owner may pass through this entrance. */
  public hasAccess(player: Player): boolean {
    if (this.vip.playerIds.includes(player.playerId)) return true;

    // the lock covering the entrance, when it is placed in a locked area
    if (this.data.lockedBy) {
      const parent = this.world.getTileAt(this.data.lockedBy.parentX, this.data.lockedBy.parentY);
      if (parent?.lock) {
        return parent.lock.ownerPlayerId === player.playerId || parent.lock.adminIds.includes(player.playerId);
      }
    }

    // otherwise the world lock of the world itself
    const index = this.world.data.worldLockIndex;
    const worldLock = index === undefined ? undefined : this.world.getTileByIndex(index);
    return worldLock?.lock?.adminIds.includes(player.playerId) ?? false;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const isPublic = (this.data.flags & TileFlags.PUBLIC) !== 0;
    const allowed = new Set<number>(this.vip.playerIds);

    const lockOwner = this.world.getTileOwnerPlayerId(this.data) ?? this.world.getOwnerPlayerId();
    if (lockOwner !== undefined) allowed.add(lockOwner);

    const lock = this.data.lockedBy ? this.world.getTileAt(this.data.lockedBy.parentX, this.data.lockedBy.parentY)?.lock : undefined;
    for (const adminId of lock?.adminIds ?? []) allowed.add(adminId);

    if (isPublic) {
      for (const other of this.world.players) allowed.add(other.playerId);
    }

    buffer.writeU8(this.extraType);
    buffer.writeU8(isPublic ? 1 : 0);
    buffer.writeU32(lockOwner ?? 0);
    buffer.writeU32(allowed.size);
    for (const playerId of allowed) buffer.writeU32(playerId);
  }
}

function broadcastConsole(world: World, message: string): void {
  for (const other of world.players) other.variants.sendOnConsoleMessage(message);
}

/** VIP ids whose checkbox was unticked. */
function uncheckedVips(action: Parameters<Parameters<typeof registerDialog>[1]>[1], vip: VipEntrance): number[] {
  const removed: number[] = [];
  for (const [key, values] of action.getEntries()) {
    if (!key.startsWith(VIP_PREFIX) || values[0] !== "0") continue;
    const playerId = Number.parseInt(key.slice(VIP_PREFIX.length), 10);
    if (!Number.isNaN(playerId) && vip.playerIds.includes(playerId)) removed.push(playerId);
  }
  return removed;
}

function addVip(player: Player, world: World, tile: TileData, vip: VipEntrance, targetNetId: number): void {
  const target = world.players.find((other) => other.netID === targetNetId);
  if (!target) {
    player.sendTextBubble("Oops, it looks like that player has already left the world.", false);
    return;
  }
  if (target.playerId === player.playerId || target.playerId === world.getTileOwnerPlayerId(tile)) {
    player.sendTextBubble("I already have access!", false);
    return;
  }
  if (vip.playerIds.includes(target.playerId)) {
    player.sendTextBubble(`${target.displayName} is already on the VIP list.`, false);
    return;
  }

  vip.playerIds.push(target.playerId);
  broadcastConsole(world, `\`2${target.displayName}\`\` was added to a VIP List.`);
  target.sendSfx("audio/secret.wav");
  target.sendTextBubble(`${player.displayName} has \`2added\`\` you to a VIP List in \`w${world.name}\`\`.`, false);
}

registerDialog("vip_edit", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  if (getItem(block.fg)?.type !== ActionTypes.VIP_ENTRANCE) return;
  if (!canEditEntrance(world, player, block) || !isInLockedArea(world, block)) return;

  const tile = new VipEntranceTile(world, block);
  const vip = tile.vip;

  if (action.contains("checkbox_public")) {
    const wasPublic = (block.flags & TileFlags.PUBLIC) !== 0;
    const isPublic = action.get("checkbox_public") === "1";
    if (wasPublic !== isPublic) {
      if (isPublic) block.flags |= TileFlags.PUBLIC;
      else block.flags &= ~TileFlags.PUBLIC;
      broadcastConsole(world, `${player.formattedName}\`\` has set a \`$VIP Entrance\`\` to ${isPublic ? "`$PUBLIC``" : "`4PRIVATE``"}`);
    }
  }

  for (const removedId of uncheckedVips(action, vip)) {
    vip.playerIds.splice(vip.playerIds.indexOf(removedId), 1);
    const removed = world.players.find((other) => other.playerId === removedId);
    const record = removed ? undefined : await PlayerDB.getById(removedId);
    const name = removed?.displayName ?? record?.display_name ?? record?.name ?? "A player";
    broadcastConsole(world, `${name} was removed from a VIP List.`);
    if (removed) {
      removed.sendSfx("audio/dialog_cancel.wav");
      removed.sendTextBubble(`${player.displayName} has \`4removed\`\` you from a VIP List in \`w${world.name}\`\`.`, false);
    }
  }

  const pickedNetId = action.getInt("playerNetID", 0, -1);
  if (pickedNetId >= 0 && action.get("playerNetID") !== "") {
    addVip(player, world, block, vip, pickedNetId);
  }

  tile.tileUpdate();
  world.markDirty();
});

/** Drops the player's own VIP list entry and lock admin entry. */
function revokeOwnAccess(player: Player, world: World, block: TileData): boolean {
  const ownerId = world.getTileOwnerPlayerId(block) ?? world.getOwnerPlayerId();
  if (ownerId === player.playerId) return false;

  let removed = false;
  const vipIndex = block.vip?.playerIds.indexOf(player.playerId) ?? -1;
  if (vipIndex !== -1) {
    block.vip!.playerIds.splice(vipIndex, 1);
    removed = true;
  }

  const parent = block.lockedBy ? world.getTileAt(block.lockedBy.parentX, block.lockedBy.parentY) : undefined;
  const adminIndex = parent?.lock ? parent.lock.adminIds.indexOf(player.playerId) : -1;
  if (parent?.lock && adminIndex !== -1) {
    parent.lock.adminIds.splice(adminIndex, 1);
    removed = true;
  }

  // access taken from the world lock itself, when the entrance sits in the
  // world-locked part of the world
  const lockIndex = world.data.worldLockIndex;
  const worldLock = lockIndex === undefined ? undefined : world.getTileByIndex(lockIndex);
  const worldAdminIndex = worldLock?.lock ? worldLock.lock.adminIds.indexOf(player.playerId) : -1;
  if (worldLock?.lock && worldAdminIndex !== -1) {
    worldLock.lock.adminIds.splice(worldAdminIndex, 1);
    removed = true;
  }

  if (removed) {
    broadcastConsole(world, `${player.formattedName}\`\` removed their access from a \`$VIP Entrance\`\`.`);
  }
  return removed;
}

registerDialog("vip_revoke", async (player, action) => {
  const target = tileFromDialog(player, action);
  if (!target) return;
  const { world, block } = target;

  if (getItem(block.fg)?.type !== ActionTypes.VIP_ENTRANCE) return;
  if (!revokeOwnAccess(player, world, block)) return;

  new VipEntranceTile(world, block).tileUpdate();
  world.markDirty();
});
