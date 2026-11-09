import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { getItem } from "../../item/item-utils";
import type { Player } from "../../player";
import { ActionTypes, LockPermission, TileFlags } from "../constants";
import { Tile } from "../tile";
import type { TileData } from "../types";
import type { World } from "../world";

/** Active Geiger Counter. */
export const GEIGER_COUNTER = 2204;
/** Dead Geiger Counter the charger accepts. */
export const DEAD_GEIGER_COUNTER = 2286;
/** One hour of charging, like the reference's `planted = now + 3600`. */
const CHARGE_MS = 3600 * 1000;
/** Charge duration in seconds, the value the tile extra counts up to. */
const CHARGE_SECONDS = 3600;
/** Tile extra type byte for the charger. */
const EXTRA_TYPE = 57;

/**
 * Geiger Charger: takes a Dead Geiger Counter (2286) and charges it back into
 * an active Geiger Counter (2204) after one hour. Extra data layout:
 * u8 extraType (57) + u32 elapsed seconds; the OPEN flag marks it occupied.
 */
export class GeigerChargerTile extends Tile {
  /**
   * The reference sets the tile's toggle bit (`0x0040`, our OPEN flag) while
   * a counter sits in the charger, so the client draws it as occupied.
   */
  public override serializedFlags(flags: number): number {
    return flags | TileFlags.TILEEXTRA | (this.data.charger?.hasGeiger ? TileFlags.OPEN : 0);
  }

  /**
   * Extra data: `u8 type 57` followed by a `u32` holding the number of
   * ELAPSED seconds (0..3600). A finished or empty charger reports 3600.
   */
  public override serialize(buffer: ExtendBuffer): void {
    buffer.writeU8(EXTRA_TYPE);
    const elapsed = Math.min(CHARGE_SECONDS, Math.max(0, CHARGE_SECONDS - this.remainingSeconds()));
    buffer.writeU32(elapsed);
  }

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;
    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.charger = { chargedAt: 0, hasGeiger: false };
    this.world.markDirty();
    this.tileUpdate();
    return true;
  }

  /** Seconds until the counter is ready, 0 when empty or already done. */
  public remainingSeconds(): number {
    const charger = this.data.charger;
    if (!charger?.hasGeiger) return 0;
    return Math.max(0, Math.ceil((charger.chargedAt - Date.now()) / 1000));
  }

  /** Wrench: report status, or accept a Dead Geiger Counter from the backpack. */
  public override async onWrench(player: Player): Promise<boolean> {
    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPunchFail(player);
      return false;
    }

    if (this.data.charger?.hasGeiger) {
      const left = this.remainingSeconds();
      player.sendTextBubble(
        left > 0
          ? `That's not done charging! (${Math.ceil(left / 60)} minutes left)`
          : "The Geiger Counter is fully charged! Punch the charger to collect it.",
        true,
      );
      return true;
    }

    return depositDeadGeiger(player, this.world, this.data);
  }

  /**
   * Punch: collect the charged counter. A counter that is still charging
   * stays inside ("That's not done charging!"), and a full backpack refuses
   * with "No room to pick it up!".
   */
  public override async onPunch(player: Player): Promise<boolean> {
    if (this.data.fg === 0) return true;

    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPunchFail(player);
      return false;
    }

    const charger = this.data.charger;
    if (!charger?.hasGeiger) return super.onPunch(player);

    if (this.remainingSeconds() > 0) {
      player.sendTextBubble("That's not done charging!", true);
      return true;
    }

    if (!player.inventory.canAddItem(GEIGER_COUNTER)) {
      player.sendTextBubble("No room to pick it up!", true);
      return true;
    }

    player.addItemInven(GEIGER_COUNTER, 1);
    this.data.charger = { chargedAt: 0, hasGeiger: false };
    this.world.markDirty();
    this.tileUpdate();
    this.world.playPositioned("audio/getpoint.wav", player.netID);
    player.sendTextBubble("Collected your charged Geiger Counter!", true);
    return true;
  }
}

/**
 * Moves a Dead Geiger Counter from the player's backpack into the charger.
 * Used both by wrenching the charger and by using the item on it.
 * @returns true when the tile is a charger (whether or not the deposit happened).
 */
export async function depositDeadGeiger(player: Player, world: World, block: TileData): Promise<boolean> {
  if (getItem(block.fg)?.type !== ActionTypes.GEIGER_CHARGER) return false;

  if (block.charger?.hasGeiger) {
    player.sendTextBubble("That charger is already in use!", true);
    return true;
  }

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) {
    player.sendTextBubble("You don't have permission to use that charger!", true);
    return true;
  }

  if (!player.inventory.hasItem(DEAD_GEIGER_COUNTER)) {
    player.sendTextBubble("Put a Dead Geiger Counter in here to charge it.", true);
    return true;
  }

  if (player.removeItemInven(DEAD_GEIGER_COUNTER, 1, true) <= 0) return true;

  block.charger = { chargedAt: Date.now() + CHARGE_MS, hasGeiger: true };
  world.playPositioned("audio/mlaunch.wav", player.netID);
  player.sendTextBubble("Your Dead Geiger Counter will be charged in 1 hour.", true);
  world.markDirty();
  new GeigerChargerTile(world, block).tileUpdate();
  return true;
}
