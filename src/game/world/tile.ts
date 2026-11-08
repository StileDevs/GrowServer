import type { ItemDefinition } from "grow-items";
import { TANK_PACKET_TYPE } from "../../constants";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { GameUpdatePacket } from "../packets/game-packet";
import { getItem } from "../item/item-utils";
import type { Player } from "../player";
import type { World } from "./world";
import type { TileData } from "./types";
import { ActionTypes, BlockFlags, BlockFlags2, ITEM_ID, LockPermission, TileFlags } from "./constants";

/** Damage one fist punch deals, in the client's units. */
const PUNCH_DAMAGE = 6;

/**
 * Base behaviour for every tile: placing, punching, breaking, dropping and
 * serializing the common 8-byte block header. Tiles that carry extra data
 * (doors, signs, ...) extend this class and override `serialize`.
 */
export class Tile {
  constructor(
    public world: World,
    public data: TileData,
  ) {}

  /** Index of this tile in the world block array. */
  public get index(): number {
    return this.data.x + this.data.y * this.world.data.width;
  }

  /** Item definition of the foreground block, or the background when there is none. */
  public get item(): ItemDefinition | undefined {
    return getItem(this.data.fg || this.data.bg);
  }

  /**
   * Triggered when a foreground block is placed on this tile.
   * @returns true when the block was placed.
   */
  public async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    const itemId = itemMeta.id!;
    if (!player.inventory.hasItem(itemId)) return false;
    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPlaceFail(player);
      return false;
    }

    this.data.fg = itemId;
    this.data.damage = 0;
    this.data.resetStateAt = 0;
    // preserve LOCKED and WATER
    this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER);

    if ((itemMeta.flags ?? 0) & BlockFlags.MULTI_FACING && player.state.rotatedLeft) {
      this.data.flags |= TileFlags.FLIPPED;
    }

    this.world.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.TILE_CHANGE_REQUEST,
        netID: player.netID,
        itemID: this.data.fg,
        tileX: this.data.x,
        tileY: this.data.y,
        flags: this.data.flags & TileFlags.FLIPPED ? 0x10 : 0,
      }).parse()!,
    );

    // the client takes the placed block out of its backpack on its own when
    // it receives the tile change echo above
    player.removeItemInven(itemId, 1, false);
    return true;
  }

  /**
   * Triggered when a background block is placed on this tile.
   */
  public async onPlaceBackground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    const itemId = itemMeta.id!;
    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD)) || !player.inventory.hasItem(itemId)) {
      await this.onPlaceFail(player);
      return false;
    }

    const currentFg = getItem(this.data.fg);
    if (currentFg?.id && (currentFg.flags ?? 0) & BlockFlags.MOD && !player.isDeveloper) {
      player.sendTextBubble("Can't put anything behind that!");
      player.sendPlayPositioned("audio/cant_place_tile.wav");
      return false;
    }

    this.data.bg = itemId;
    if (!this.data.fg) this.data.damage = 0;

    this.world.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.TILE_CHANGE_REQUEST,
        netID: player.netID,
        itemID: this.data.bg,
        tileX: this.data.x,
        tileY: this.data.y,
      }).parse()!,
    );

    player.removeItemInven(itemId, 1, false);
    return true;
  }

  /** The player lacks permission to build here. */
  public async onPlaceFail(player: Player): Promise<void> {
    if (this.data.lockedBy) {
      const lockParent = this.world.getTileAt(this.data.lockedBy.parentX, this.data.lockedBy.parentY);
      if (lockParent?.lock && lockParent.fg === ITEM_ID.BUILDERS_LOCK) {
        player.sendTextBubble("This lock allows building only!", false);
      }
    } else {
      await this.sendAreaOwner(player);
    }
    this.sendLockSound(player);
  }

  /**
   * Triggered when the tile is punched with the fist.
   * @returns true when the punch was allowed.
   */
  public async onPunch(player: Player): Promise<boolean> {
    if (this.data.fg === 0 && this.data.bg === 0) return true;

    const itemMeta = this.item;
    if (!itemMeta) return false;
    const flags = itemMeta.flags ?? 0;

    if (!player.isDeveloper) {
      if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BREAK)) && !(flags & BlockFlags.PUBLIC)) {
        await this.onPunchFail(player);
        return false;
      }

      if (flags & BlockFlags.AUTO_PICKUP && !player.inventory.canAddItem(itemMeta.id!)) {
        player.sendTextBubble("I better not break that, I have no room to pick it up.");
        return false;
      } else if (flags & BlockFlags.MOD) {
        player.sendTextBubble("It's too strong to break.");
        player.sendPlayPositioned("audio/cant_place_tile.wav");
        return false;
      }
    }

    this.applyDamage(player, PUNCH_DAMAGE);

    if ((this.data.damage ?? 0) >= (itemMeta.breakHits ?? 1)) {
      await this.onDestroy(player);
    }

    return true;
  }

  /** The player lacks permission to break here. */
  public async onPunchFail(player: Player): Promise<void> {
    if (this.data.lockedBy) {
      const lockParent = this.world.getTileAt(this.data.lockedBy.parentX, this.data.lockedBy.parentY);
      if (lockParent?.lock && lockParent.fg === ITEM_ID.BUILDERS_LOCK) {
        player.sendTextBubble("This lock allows building only!", false);
      }
    }
    this.sendLockSound(player);
  }

  /**
   * Removes the foreground (or background when no foreground) block and drops its loot.
   */
  public async onDestroy(player: Player): Promise<void> {
    let destroyedItemId = 0;
    if (this.data.fg === 0) {
      destroyedItemId = this.data.bg;
      this.data.bg = 0;
    } else {
      destroyedItemId = this.data.fg;
      this.data.fg = 0;
    }

    this.data.damage = 0;
    this.data.resetStateAt = 0;
    this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER);

    this.onDrop(player, destroyedItemId);

    this.world.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.TILE_CHANGE_REQUEST,
        netID: player.netID,
        itemID: ITEM_ID.FIST,
        tileX: this.data.x,
        tileY: this.data.y,
      }).parse()!,
    );
  }

  /**
   * Drops the loot of a destroyed block: the block itself, its seed or gems.
   */
  public onDrop(player: Player, destroyedItemId: number): void {
    const itemMeta = getItem(destroyedItemId);
    if (!itemMeta) return;
    const flags = itemMeta.flags ?? 0;

    if (flags & BlockFlags.PERMANENT) {
      // perma-items go straight back to the breaker; when the backpack has
      // no room they are dropped on the tile instead so they are never lost
      if (!player.inventory.canAddItem(destroyedItemId)) {
        this.world.drop(player, this.data.x * 32 + 8, this.data.y * 32 + 8, destroyedItemId, 1, { tree: true });
        return;
      }

      // spawn a one-item object on the tile, then let the player collect it:
      // the client counts the item itself from the collect packet, so the
      // backpack is updated here without a MODIFY_ITEM_INVENTORY packet
      const objectId = ++this.world.data.dropped.uid;
      this.world.broadcast(
        GameUpdatePacket.create({
          type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
          netID: -1,
          targetNetID: -1,
          float_var: 1,
          itemID: destroyedItemId,
          posX: this.data.x * 32,
          posY: this.data.y * 32,
        }).parse()!,
      );
      this.world.broadcast(
        GameUpdatePacket.create({
          type: TANK_PACKET_TYPE.ITEM_CHANGE_OBJECT,
          netID: player.netID,
          targetNetID: -1,
          itemID: objectId,
        }).parse()!,
      );
      player.addItemInven(destroyedItemId, 1, false);
      player.variants.sendOnConsoleMessage(`Collected \`w1 ${itemMeta.name}\`\`.`);
      return;
    } else if (flags & BlockFlags.DROPLESS) {
      return;
    }

    const dropX = this.data.x * 32 + Math.floor(Math.random() * 16);
    const dropY = this.data.y * 32 + Math.floor(Math.random() * 16);
    const rand = Math.random();

    if (rand <= 0.11) {
      // 1/9 chance: the block itself
      this.world.drop(player, dropX, dropY, destroyedItemId, 1, { tree: true });
    } else if (rand <= 0.33) {
      // 2/9 chance: its seed
      if (flags & BlockFlags.SEEDLESS) return;
      this.world.drop(player, dropX, dropY, destroyedItemId + 1, 1, { tree: true });
    } else if (!((itemMeta.flags2 ?? 0) & BlockFlags2.GEMLESS)) {
      // items without a rarity never drop gems
      if ((itemMeta.rarity ?? 999) >= 999) return;
      this.spawnGems(player, itemMeta.rarity ?? 0);
    }
  }

  /**
   * Triggered when an item is used on a tile that already has a foreground
   * block (seeds on trees, consumables, ...). The base implementation only
   * checks permissions.
   */
  public async onItemPlace(player: Player, _item: ItemDefinition): Promise<boolean> {
    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD))) {
      await this.onPlaceFail(player);
      return false;
    }
    return true;
  }

  /**
   * Triggered when the tile is wrenched.
   * @returns true when the player may configure the tile.
   */
  public async onWrench(player: Player): Promise<boolean> {
    const itemMeta = getItem(this.data.fg);
    if (!itemMeta) return false;
    if (!(await this.world.hasTilePermission(player, this.data, LockPermission.BUILD)) || !((itemMeta.flags ?? 0) & BlockFlags.WRENCHABLE)) {
      return false;
    }
    return true;
  }

  /** Writes the tile extra data (after the common header). */
  public serialize(_buffer: ExtendBuffer): void {}

  /** Lets a tile adjust the flags that get serialized without changing the stored ones. */
  public serializedFlags(flags: number): number {
    return flags;
  }

  private serializeHeader(buffer: ExtendBuffer): void {
    buffer.writeU16(this.data.fg);
    buffer.writeU16(this.data.bg);

    const lockIndex = this.data.lockedBy ? this.data.lockedBy.parentX + this.data.lockedBy.parentY * this.world.data.width : 0;
    buffer.writeU16(lockIndex);

    const flags = this.serializedFlags(this.data.flags);
    buffer.writeU16(flags);

    if (flags & TileFlags.LOCKED) {
      buffer.writeU16(lockIndex);
    }
  }

  /**
   * Applies punch damage to the tile and broadcasts it to the world.
   */
  public applyDamage(player: Player, damage: number): void {
    if (player.currentWorld !== this.world.name) return;

    if (!this.data.resetStateAt || this.data.resetStateAt <= Date.now()) {
      this.data.damage = 0;
    }
    if (damage !== 0) {
      this.data.damage = (this.data.damage ?? 0) + damage / PUNCH_DAMAGE;
    }

    const itemMeta = this.item;
    this.data.resetStateAt = Date.now() + (itemMeta?.resetStateAfter ?? 4) * 1000;

    this.world.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.TILE_APPLY_DAMAGE,
        netID: player.netID,
        itemID: damage,
        tileX: this.data.x,
        tileY: this.data.y,
      }).parse()!,
    );
  }

  /** Full tile bytes: header plus extra data. */
  public parse(): ExtendBuffer {
    const buffer = new ExtendBuffer(0);
    this.serializeHeader(buffer);
    this.serialize(buffer);
    return buffer;
  }

  /** Sends the current tile state to everyone in the world. */
  public tileUpdate(): void {
    const serialized = this.parse();
    this.world.broadcast(
      GameUpdatePacket.create({
        type: TANK_PACKET_TYPE.SEND_TILE_UPDATE_DATA,
        tileX: this.data.x,
        tileY: this.data.y,
        extraData: serialized.data,
      }).parse()!,
    );
  }

  protected sendLockSound(player: Player): void {
    this.world.playPositioned("audio/punch_locked.wav", player.netID);
  }

  private async sendAreaOwner(player: Player): Promise<void> {
    const ownerName = await this.world.getTileOwnerName(this.data);
    if (!ownerName) return;
    player.sendTextBubble(`That area is owned by ${ownerName}`);
  }

  /**
   * Gem amount for a broken block, based on rarity; some items drop a bonus.
   */
  private randomizeGemsDrop(rarity: number): number {
    const roll = Math.random();
    let bonus = 0;
    const threshold = Math.min(0.1 + rarity / 100, 0.5);
    if (roll <= threshold) bonus = 1;
    if (rarity >= 30 && roll <= 0.5) bonus = 5;
    else if (rarity >= 60 && roll <= 0.6) bonus = 12;
    else if (rarity >= 60 && roll <= 0.3) bonus = 5;

    const gems = rarity < 30 ? rarity / 12 : rarity / 8;
    return Math.floor(gems + bonus);
  }

  /** Splits a gem total into the denominations the client can display. */
  private splitGemsDrop(totalGems: number): number[] {
    const GEM_LIMITS = [100, 50, 10, 5, 1];
    const result: number[] = [];
    let remaining = totalGems;
    for (const limit of GEM_LIMITS) {
      result.push(...Array<number>(Math.floor(remaining / limit)).fill(limit));
      remaining %= limit;
    }
    return result;
  }

  protected spawnGems(player: Player, rarity: number): void {
    for (const gem of this.splitGemsDrop(this.randomizeGemsDrop(rarity))) {
      this.world.drop(player, this.data.x * 32 + Math.floor(Math.random() * 16), this.data.y * 32 + Math.floor(Math.random() * 16), ITEM_ID.GEMS, gem, {
        tree: true,
        noSimilar: true,
      });
    }
  }
}

/** Action types whose tiles are plain blocks with no extra data. */
export const PLAIN_ACTION_TYPES: ReadonlySet<number> = new Set([
  ActionTypes.FOREGROUND,
  ActionTypes.BACKGROUND,
  ActionTypes.BEDROCK,
  ActionTypes.LAVA,
  ActionTypes.PLATFORM,
  ActionTypes.DEADLY_BLOCK,
  ActionTypes.TRAMPOLINE,
  ActionTypes.GATEWAY,
  ActionTypes.SFX_WITH_EXTRA_FRAME,
  ActionTypes.FOREGROUND_WITH_EXTRA_FRAME,
  ActionTypes.BACKGD_SFX_EXTRA_FRAME,
  ActionTypes.BOUNCY,
  ActionTypes.POINTY,
  ActionTypes.CHECKPOINT,
  ActionTypes.SHEET_MUSIC,
  ActionTypes.ICE,
  ActionTypes.BOOMBOX,
  ActionTypes.BACK_BOOMBOX,
  ActionTypes.PINATA,
  ActionTypes.CHEMICAL,
  ActionTypes.LAB,
  ActionTypes.SCORE_BOARD,
  ActionTypes.SUNGATE,
  ActionTypes.PROFILE,
  ActionTypes.DEADLY_IF_ON,
  ActionTypes.COMPACTOR,
  ActionTypes.WIND,
  ActionTypes.PETFISH,
  ActionTypes.STEAMPUNK,
  ActionTypes.STEAM_LAVA_IF_ON,
  ActionTypes.FOSSIL,
  ActionTypes.VALHOWLA,
  ActionTypes.CHEMSYNTH,
  ActionTypes.MUD,
  ActionTypes.ROOT_CUTTING,
  ActionTypes.BOMB,
  ActionTypes.SLIME,
  ActionTypes.COMPLETIONIST,
  ActionTypes.ANCES,
]);
