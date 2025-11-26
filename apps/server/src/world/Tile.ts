import { TankPacket, Variant } from "growtopia.js";
import { Peer } from "../core/Peer";
import type { World } from "../core/World";
import { type TileData } from "@growserver/types";
import type { Base } from "../core/Base";
import { ExtendBuffer } from "@growserver/utils";
import { TileMap } from "./tiles";
import {
  ActionTypes,
  BlockFlags,
  BlockFlags2,
  ITEM_RAYMANS_FIST,
  LockPermission,
  ROLE,
  TankTypes,
  TileFlags,
} from "@growserver/const";
import { NormalTile } from "./tiles/NormalTile";
import { ItemDefinition } from "grow-items";

export class Tile {
  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {}

  /**
   * Triggered when a foreground block is placed.
   * @param peer Peer that places the block
   * @param itemMeta what block is being placed
   * @returns True if the block is successfully placed. False otherwise.
   */
  public async onPlaceForeground(
    peer: Peer,
    itemMeta: ItemDefinition,
  ): Promise<boolean> {
    if (!peer.searchItem(itemMeta.id!)) return false;
    if (
      !(await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BUILD,
      ))
    ) {
      await this.onPlaceFail(peer);
      return false;
    }

    this.data.fg = itemMeta.id!;
    this.data.damage = 0;
    this.data.resetStateAt = 0;
    this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER); // preserve LOCKED and WATER

    if (itemMeta.flags! & BlockFlags.MULTI_FACING) {
      if (peer.data.rotatedLeft) this.data.flags |= TileFlags.FLIPPED;
    }

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      xPunch: this.data.x,
      yPunch: this.data.y,
      info:   this.data.fg,
      state:  this.data.flags & TileFlags.FLIPPED ? 0x10 : 0, // set the rotateLeft flag
    });

    this.world.every((p) => {
      p.send(tank);
    });

    peer.removeItemInven(itemMeta.id!, 1);

    return true;
  }

  /**
   * Triggered when a background block is placed.
   * @param peer Peer that places the block
   * @param itemMeta what block is being placed
   * @returns True if the block is successfully placed. False otherwise.
   */
  public async onPlaceBackground(
    peer: Peer,
    itemMeta: ItemDefinition,
  ): Promise<boolean> {
    if (
      !(await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BUILD,
      )) ||
      !peer.searchItem(itemMeta.id!)
    ) {
      await this.onPlaceFail(peer);
      return false;
    }

    const currTileItemMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    );

    if (
      currTileItemMeta!.id &&
      currTileItemMeta!.flags! & BlockFlags.MOD &&
      peer.data.role != ROLE.DEVELOPER
    ) {
      peer.sendTextBubble(
        "Can't put anything behind that!",
        true,
        peer.data.netID,
      );
      peer.sendOnPlayPositioned("audio/cant_place_tile.wav", {
        netID: peer.data?.netID,
      });
      return false;
    }

    this.data.bg = itemMeta.id!;
    if (!this.data.fg) this.data.damage = 0;

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      xPunch: this.data.x,
      yPunch: this.data.y,
      info:   this.data.bg,
    });

    this.world.every((p) => {
      p.send(tank);
    });

    peer.removeItemInven(itemMeta.id!, 1);
    return true;
  }

  // Fail only means that the player doing it doesnt have sufficient permission.
  //  (applies to all function with Fail suffix that handle tile interactions)
  public async onPlaceFail(peer: Peer): Promise<void> {
    if (this.data.lockedBy) {
      const lockParent =
        this.world.data.blocks[
          this.data.lockedBy.parentY * this.world.data.width +
            this.data.lockedBy.parentX
        ];
      // Builder's lock
      if (lockParent.lock && lockParent.fg == 4994) {
        peer.sendTextBubble("This lock allows building only!", false);
      }
    }
    // not a builder's lock, so we just send the area owner :D
    else {
      await this.sendAreaOwner(peer);
    }
    this.sendLockSound(peer);
  }

  /**
   * Triggered on punch.
   * @param peer Peer that punches the tile
   * @returns True if the punch is successful. False otherwise.
   */
  public async onPunch(peer: Peer): Promise<boolean> {
    // nothing is being punched, but the player also has access to the tile. Lets just return true
    if (this.data.fg == 0 && this.data.bg == 0) return true;

    const itemMeta = this.base.items.metadata.items.get(
      (this.data.fg ? this.data.fg : this.data.bg).toString(),
    )!;
    if (peer.data.role != ROLE.DEVELOPER) {
      if (
        !(await this.world.hasTilePermission(
          peer.data.userID,
          this.data,
          LockPermission.BREAK,
        )) &&
        !(itemMeta.flags! & BlockFlags.PUBLIC)
      ) {
        this.onPunchFail(peer);
        return false;
      }

      if (
        itemMeta.flags! & BlockFlags.AUTO_PICKUP &&
        !peer.canAddItemToInv(itemMeta.id!)
      ) {
        peer.sendTextBubble(
          "I better not break that, I have no room to pick it up.",
          true,
        );
        return false;
      } else if (itemMeta.flags! & BlockFlags.MOD) {
        peer.sendTextBubble("It's too strong to break.", true);
        peer.sendOnPlayPositioned("audio/cant_place_tile.wav", {
          netID: peer.data?.netID,
        });
        return false;
      }
    }

    // Check if player has Rayman's Fist equipped
    const hasRaymansFist = peer.data.clothing.hand === ITEM_RAYMANS_FIST;

    if (hasRaymansFist) {
      await this.handleRaymanPunch(peer);
    } else {
      this.applyDamage(peer, 6);

      if (this.data.damage && this.data.damage >= itemMeta.breakHits!) {
        this.onDestroy(peer);
      }
    }

    return true;
  }

  public async onPunchFail(peer: Peer): Promise<void> {
    if (this.data.lockedBy) {
      const lockParent =
        this.world.data.blocks[
          this.data.lockedBy.parentY * this.world.data.width +
            this.data.lockedBy.parentX
        ];
      // Builder's lock
      if (lockParent.lock && lockParent.fg == 4994) {
        peer.sendTextBubble("This lock allows building only!", false);
      }
    }
    this.sendLockSound(peer);
  }

  /**
   * Handle Rayman's Fist 3-tile punch mechanic
   * @param peer Peer performing the punch
   */
  private async handleRaymanPunch(peer: Peer): Promise<void> {
    const MAX_DIST = 3; // Maximum 3 tiles

    const playerX = Math.floor((peer.data.x ?? 0) / 32);
    const playerY = Math.floor((peer.data.y ?? 0) / 32);

    let dirX = 0;
    let dirY = 0;

    // horizontal dir
    if (this.data.x > playerX) {
      dirX = 1; /* punching right */
    } else if (this.data.x < playerX) {
      dirX = -1; /* punching left */
    }

    // vertical dir
    if (this.data.y > playerY) {
      dirY = 1; /* punching down */
    } else if (this.data.y < playerY) {
      dirY = -1; /* Punching up */
    }

    if (dirX === 0 && dirY === 0) {
      dirX = peer.data.rotatedLeft ? -1 : 1;
    }

    for (let i = 0; i < MAX_DIST; i++) {
      const targetX = this.data.x + dirX * i;
      const targetY = this.data.y + dirY * i;

      // Check bounds
      if (
        targetX < 0 ||
        targetX >= this.world.data.width ||
        targetY < 0 ||
        targetY >= this.world.data.height
      ) {
        break;
      }

      const targetPos = targetX + targetY * this.world.data.width;
      const targetTile = this.world.data.blocks[targetPos];

      if (targetTile.fg === 0 && targetTile.bg === 0) {
        continue; /* skip */
      }

      const tile = new Tile(this.base, this.world, targetTile);

      const itemMeta = this.base.items.metadata.items.get(
        (targetTile.fg ? targetTile.fg : targetTile.bg).toString(),
      );
      if (!itemMeta) continue;

      if (peer.data.role != ROLE.DEVELOPER) {
        if (
          !(await this.world.hasTilePermission(
            peer.data.userID,
            targetTile,
            LockPermission.BREAK,
          )) &&
          !(itemMeta.flags! & BlockFlags.PUBLIC)
        ) {
          continue; // Skip this tile if no permission
        }

        if (itemMeta.flags! & BlockFlags.MOD) {
          continue; // Skip unbreakable blocks
        }
      }

      await tile.applyDamage(peer, 6);

      // Check if tile should be destroyed
      if (targetTile.damage && targetTile.damage >= itemMeta.breakHits!) {
        await tile.onDestroy(peer);
      }
    }
  }

  /**
   * Triggered when a background or foregorund block is destroyed.
   * @param peer Peer that destroys it
   */
  public async onDestroy(peer: Peer): Promise<void> {
    let destroyedItemID = 0;
    if (this.data.fg == 0) {
      destroyedItemID = this.data.bg;
      this.data.bg = 0;
    } else {
      destroyedItemID = this.data.fg;
      this.data.fg = 0;
    }

    this.data.damage = 0;
    this.data.resetStateAt = 0;
    this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER); // preserve LOCKED and WATER

    this.onDrop(peer, destroyedItemID);

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      info:   18,
      xPunch: this.data.x,
      yPunch: this.data.y,
    });

    this.world.every((p) => {
      p.send(tank);
    });
  }

  public async onDrop(peer: Peer, destroyedItemID: number) {
    const itemMeta = this.base.items.metadata.items.get(
      destroyedItemID.toString(),
    );
    if (!itemMeta) return;

    if (itemMeta.flags! & BlockFlags.PERMANENT) {
      const objectID = ++this.world.data.dropped.uid;
      const dropPkt = new TankPacket({
        type:        TankTypes.ITEM_CHANGE_OBJECT,
        netID:       -1,
        targetNetID: -1,
        info:        destroyedItemID,
        xPos:        this.data.x * 32,
        yPos:        this.data.y * 32,
      });
      const collectPkt = new TankPacket({
        type:        TankTypes.ITEM_CHANGE_OBJECT,
        netID:       peer.data.netID,
        targetNetID: -1,
        info:        objectID,
      });
      this.world.every((p) => {
        p.send(dropPkt, collectPkt);
      });
      peer.addItemInven(destroyedItemID);
      peer.sendConsoleMessage(`Collected \`w1 ${itemMeta.name}\`\`.\`\``);
      return;
    } else if (itemMeta.flags! & BlockFlags.DROPLESS) return;

    // Tried to find info about drop rates, here's an info on seeds: https://growtopia.fandom.com/wiki/Gems
    // https://www.growtopiagame.com/forums/forum/general/guidebook/273543-farming-calculator%E2%80%94estimate-seeds-gems-xp-with-formula-explanations
    // https://www.growtopiagame.com/forums/forum/general/guidebook/284860-beastly-s-calculator-hub/page12
    const rand = Math.random();
    if (rand <= 0.11) {
      // 1/9 chance
      this.world.drop(
        peer,
        this.data.x * 32 + Math.floor(Math.random() * 16),
        this.data.y * 32 + Math.floor(Math.random() * 16),
        itemMeta.id!,
        1,
        { tree: true },
      ); // block
      return;
    } else if (rand <= 0.33) {
      // 2/9 chance
      if (itemMeta.flags! & BlockFlags.SEEDLESS) return;
      this.world.drop(
        peer,
        this.data.x * 32 + Math.floor(Math.random() * 16),
        this.data.y * 32 + Math.floor(Math.random() * 16),
        itemMeta.id! + 1,
        1,
        { tree: true },
      ); // seed
      return;
    } else if (!(itemMeta.flags2! & BlockFlags2.GEMLESS)) {
      // check if it is not GEMLESS
      // Prevent no rarity items drop gems
      if (itemMeta.rarity! >= 999) {
        return;
      }

      this.calculateAndSpawnGems(peer, itemMeta.rarity!);
    }
  }

  /**
   * Triggered when the peer tries to place item on a tile that already has block.
   * Placing any background item does not trigger this method. This method can be triggered by:
   * Placing seed on existing seed, Placing any block on existing display block, using consumables,
   * Placing clothes (weird way to wear clothes), Placing water, etc
   * @param peer Peer that initiates the packet
   * @param item Item that is being placed
   */
  public async onItemPlace(peer: Peer, item: ItemDefinition): Promise<boolean> {
    if (
      !(await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BUILD,
      ))
    ) {
      this.onPlaceFail(peer);
      return false;
    }
    return true;
  }

  /**
   * Triggered when a peer is wrenching on a tile.
   * @param peer Peer that initiates the wrenching
   * @returns True if it passes basic sanity checks and permission checks. False otherwise
   */
  public async onWrench(peer: Peer): Promise<boolean> {
    const itemMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    )!;
    if (
      !(await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BUILD,
      )) ||
      !(itemMeta.flags! & BlockFlags.WRENCHABLE)
    ) {
      return false;
    }

    return true;
  }

  // TOOD: Implement.
  public async onPlayerPass(peer: Peer): Promise<void> {}

  // TODO: Implement.
  public async onStep(peer: Peer): Promise<void> {}

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {}

  // usually not needed to be overriden unless you want to do something funky
  // also useful to set flags without modifying the actual tile flag (temporary)
  public async setFlags(flags: number): Promise<number> {
    return flags;
  }

  public async setParentTileIndex(tileIndex: number): Promise<number> {
    return this.data.lockedBy
      ? (this.data.lockedBy.parentX as number) +
          (this.data.lockedBy.parentY as number) * this.world.data.width
      : 0;
  }

  private async serializeBlockData(dataBuffer: ExtendBuffer) {
    dataBuffer.writeU16(this.data.fg);
    dataBuffer.writeU16(this.data.bg);
    dataBuffer.writeU16(await this.setParentTileIndex(0));

    const flags = await this.setFlags(this.data.flags);

    dataBuffer.writeU16(flags);

    if (flags & TileFlags.LOCKED) {
      dataBuffer.grow(2);

      const lockPos = this.data.lockedBy
        ? (this.data.lockedBy.parentX as number) +
          (this.data.lockedBy.parentY as number) * this.world.data.width
        : 0;

      dataBuffer.writeU16(lockPos);
    }
  }

  /**
   * Apply damage on this tile and broadcast it
   * @param peer peer that applied the damage
   * @param damage damage to the tile
   * @param baseTankPkt You can provide your own TankPacket here. Fields that will be overidden are: `type`, `netID`, `info`, `xPunch`, and `yPunch`. (Optional)
   */
  public async applyDamage(
    peer: Peer,
    damage: number,
    baseTankPkt?: TankPacket,
  ): Promise<void> {
    if (peer.data.world == this.world.worldName) {
      if (
        !this.data.resetStateAt ||
        (this.data.resetStateAt as number) <= Date.now()
      )
        this.data.damage = 0;
      // i dont like how there are no health field in the item meta. But atleast there is a workaround :) - Badewen
      if (damage != 0) {
        (this.data.damage as number) += damage / 6;
      }

      const tank = baseTankPkt ?? new TankPacket({});

      tank!.data!.type = TankTypes.TILE_APPLY_DAMAGE;
      tank!.data!.netID = peer.data.netID;
      tank!.data!.info = damage;
      tank!.data!.xPunch = this.data.x;
      tank!.data!.yPunch = this.data.y;

      const itemMeta = this.base.items.metadata.items.get(
        (this.data.fg ? this.data.fg : this.data.bg).toString(),
      )!;

      this.data.resetStateAt =
        Date.now() + (itemMeta.resetStateAfter as number) * 1000;

      this.world.every((p) => {
        p.send(tank);
      });
    }
  }

  public async parse(): Promise<ExtendBuffer> {
    // default blocks contains length of 8
    const dataBuffer = new ExtendBuffer(8);

    await this.serializeBlockData(dataBuffer);
    await this.serialize(dataBuffer);

    return dataBuffer;
  }

  public async tileUpdate(peer: Peer) {
    const serializedData = await this.parse();

    peer.send(
      TankPacket.from({
        type:   TankTypes.SEND_TILE_UPDATE_DATA,
        xPunch: this.data.x,
        yPunch: this.data.y,
        data:   () => serializedData.data,
      }),
    );
  }

  protected sendLockSound(peer: Peer) {
    if (this.world) {
      this.world.every((p) => {
        p.sendOnPlayPositioned("audio/punch_locked.wav", {
          netID: peer.data?.netID,
        });
      });
    }
  }

  private async sendAreaOwner(peer: Peer) {
    if (!(this.world.getOwnerUID() || this.data.lockedBy)) return;

    const ownerUserID =
      this.world.getOwnerUID() ??
      this.world.data.blocks[
        this.data.lockedBy!.parentY * this.world.data.width +
          this.data.lockedBy!.parentX
      ].lock!.ownerUserID;

    const ownerName = await this.base.database.players.getByUID(ownerUserID);

    peer.sendTextBubble(
      `That area is owned by ${ownerName?.display_name}`,
      true,
      peer.data.netID,
    );
  }

  // Trying to add more gems, because https://growtopia.fandom.com/wiki/Chandelier
  // some items may drop more than gem calculation based on rarity
  private randomizeGemsDrop(rarity: number): number {
    const max = Math.random();
    let bonus = 0;
    const threshold = Math.min(0.1 + rarity / 100, 0.5); // Linear increase, caps on 0.5
    // How it works: For rarity 5, threshold = 0.15, For rarity 30, threshold = 0.2
    if (max <= threshold) {
      bonus = 1;
    }
    if (rarity >= 30 && max <= 0.5) {
      bonus = 5;
    } else if (rarity >= 60 && max <= 0.6) {
      bonus = 12;
    } else if (rarity >= 60 && max <= 0.3) {
      bonus = 5;
    }

    // Gem Calculation based on Rarity
    let gems: number;
    if (rarity < 30) {
      gems = rarity / 12;
    } else {
      gems = rarity / 8;
    }

    return Math.floor(gems + bonus);
  }

  private splitGemsDrop(totalGems: number): number[] {
    // List of gems limit. 1 for normal gems and 10 for red gems.
    const GEMS_LIMITS = [100, 50, 10, 5, 1];
    let ret: Array<number> = [];
    let currentGems = totalGems;

    for (const limit of GEMS_LIMITS) {
      // Create an array with the length of Math.floor(currentGems / limit)
      //  and fill it with limit the push it to ret
      ret = ret.concat(Array(Math.floor(currentGems / limit)).fill(limit));
      currentGems = currentGems % limit;
    }

    return ret;
  }

  protected calculateAndSpawnGems(peer: Peer, rarity: number) {
    const gemList = this.splitGemsDrop(this.randomizeGemsDrop(rarity));

    for (const gem of gemList) {
      this.world.drop(
        peer,
        this.data.x * 32 + Math.floor(Math.random() * 16),
        this.data.y * 32 + Math.floor(Math.random() * 16),
        112,
        gem,
        { tree: true, noSimilar: true },
      );
    }
  }
}
