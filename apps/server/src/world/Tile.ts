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
    public peer: Peer,
    public data: TileData,
  ) {}

  /**
   * Triggered when a foreground block is placed.
   * @param id what block is being placed
   * @returns True if the block is successfully placed. False otherwise.
   */
  public async onPlaceForeground(id: number, flags: number): Promise<boolean> {
    if (!this.peer.searchItem(id)) return false;
    if (
      !(await this.world.hasTilePermission(
        this.peer.data.userID,
        this.data,
        LockPermission.BUILD,
      ))
    ) {
      await this.onPlaceFail();
      return false;
    }

    this.data.fg = id;
    this.data.damage = 0;
    this.data.resetStateAt = 0;
    this.data.flags = this.data.flags & (TileFlags.LOCKED | TileFlags.WATER); // preserve LOCKED and WATER

    if (flags & BlockFlags.MULTI_FACING) {
      if (this.peer.data.rotatedLeft) this.data.flags |= TileFlags.FLIPPED;
    }

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      xPunch: this.data.parent.x,
      yPunch: this.data.parent.y,
      info:   this.data.fg,
      state:  this.data.flags & TileFlags.FLIPPED ? 0x10 : 0, // set the rotateLeft flag
    });

    this.world.every((p) => {
      p.send(tank);
    });

    this.peer.removeItemInven(id, 1);

    return true;
  }

  /**
   * Triggered when a background block is placed.
   * @param peer Peer that places the block
   * @param itemMeta what block is being placed
   * @returns True if the block is successfully placed. False otherwise.
   */
  public async onPlaceBackground(
    id: number
  ): Promise<boolean> {
    if (
      !(await this.world.hasTilePermission(
        this.peer.data.userID,
        this.data,
        LockPermission.BUILD,
      )) ||
      !this.peer.searchItem(id)
    ) {
      await this.onPlaceFail();
      return false;
    }

    const currTileItemMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    );

    if (
      currTileItemMeta!.id &&
      currTileItemMeta!.flags! & BlockFlags.MOD &&
      this.peer.data.role != ROLE.DEVELOPER
    ) {
      this.peer.sendTextBubble(
        "Can't put anything behind that!",
        true,
        this.peer.data.netID,
      );
      this.peer.sendOnPlayPositioned("audio/cant_place_tile.wav", {
        netID: this.peer.data.netID,
      });
      return false;
    }

    this.data.bg = id;
    if (!this.data.fg) this.data.damage = 0;

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      xPunch: this.data.parent.x,
      yPunch: this.data.parent.y,
      info:   this.data.bg,
    });

    this.world.every((p) => {
      p.send(tank);
    });

    this.peer.removeItemInven(id, 1);
    return true;
  }

  // Fail only means that the player doing it doesnt have sufficient permission.
  //  (applies to all function with Fail suffix that handle tile interactions)
  public async onPlaceFail(): Promise<void> {
    if (this.data.lockedBy) {
      const lockParent =
        this.world.data.blocks[
          this.data.lockedBy.parentY * this.world.data.width +
            this.data.lockedBy.parentX
        ];
      // Builder's lock
      if (lockParent.lock && lockParent.fg == 4994) {
        this.peer.sendTextBubble("This lock allows building only!", false);
      }
    }
    // not a builder's lock, so we just send the area owner :D
    else {
      await this.sendAreaOwner(this.peer);
    }
    this.sendLockSound();
  }

  /**
   * Triggered on punch.
   * @param peer Peer that punches the tile
   * @returns True if the punch is successful. False otherwise.
   */
  public async onPunch(id: number, flags: number, breakHits: number): Promise<boolean> {
    // nothing is being punched, but the player also has access to the tile. Lets just return true
    if (this.data.fg == 0 && this.data.bg == 0) return true;

    if (this.peer.data.role != ROLE.DEVELOPER) {
      if (
        !(await this.world.hasTilePermission(
          this.peer.data.userID,
          this.data,
          LockPermission.BREAK,
        )) &&
        !(flags & BlockFlags.PUBLIC)
      ) {
        this.onPunchFail();
        return false;
      }

      if (
        flags & BlockFlags.AUTO_PICKUP &&
        !this.peer.canAddItemToInv(id)
      ) {
        this.peer.sendTextBubble(
          "I better not break that, I have no room to pick it up.",
          true,
        );
        return false;
      } else if (flags & BlockFlags.MOD) {
        this.peer.sendTextBubble("It's too strong to break.", true);
        this.peer.sendOnPlayPositioned("audio/cant_place_tile.wav", {
          netID: this.peer.data.netID,
        });
        return false;
      }
    }

    // Check if player has Rayman's Fist equipped
    const hasRaymansFist = this.peer.data.clothing.hand === ITEM_RAYMANS_FIST;

    if (hasRaymansFist) {
      await this.handleRaymanPunch(id, flags, breakHits);
    } else {
      this.applyDamage(6);

      if (this.data.damage && this.data.damage >= breakHits) {
        this.onDestroy();
      }
    }

    return true;
  }

  public async onPunchFail(): Promise<void> {
    if (this.data.lockedBy) {
      const lockParent =
        this.world.data.blocks[
          this.data.lockedBy.parentY * this.world.data.width +
            this.data.lockedBy.parentX
        ];
      // Builder's lock
      if (lockParent.lock && lockParent.fg == 4994) {
        this.peer.sendTextBubble("This lock allows building only!", false);
      }
    }
    this.sendLockSound();
  }

  /**
   * Handle Rayman's Fist 3-tile punch mechanic
   */
  private async handleRaymanPunch(id: number, flags: number, breakHits: number): Promise<void> {
    const MAX_DIST = 3; // Maximum 3 tiles

    const playerX = Math.floor((this.peer.data.x ?? 0) / 32);
    const playerY = Math.floor((this.peer.data.y ?? 0) / 32);

    let dirX = 0;
    let dirY = 0;

    // horizontal dir
    if (this.data.parent.x > playerX) {
      dirX = 1; /* punching right */
    } else if (this.data.parent.x < playerX) {
      dirX = -1; /* punching left */
    }

    // vertical dir
    if (this.data.parent.y > playerY) {
      dirY = 1; /* punching down */
    } else if (this.data.parent.y < playerY) {
      dirY = -1; /* Punching up */
    }

    if (dirX === 0 && dirY === 0) {
      dirX = this.peer.data.rotatedLeft ? -1 : 1;
    }

    for (let i = 0; i < MAX_DIST; i++) {
      const targetX = this.data.parent.x + dirX * i;
      const targetY = this.data.parent.y + dirY * i;

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

      const tile = new Tile(this.base, this.world, this.peer, targetTile);


      if (this.peer.data.role != ROLE.DEVELOPER) {
        if (
          !(await this.world.hasTilePermission(
            this.peer.data.userID,
            targetTile,
            LockPermission.BREAK,
          )) &&
          !(flags & BlockFlags.PUBLIC)
        ) {
          continue; // Skip this tile if no permission
        }

        if (flags & BlockFlags.MOD) {
          continue; // Skip unbreakable blocks
        }
      }

      await tile.applyDamage(6);

      // Check if tile should be destroyed
      if (targetTile.damage && targetTile.damage >= breakHits) {
        await tile.onDestroy();
      }
    }
  }

  /**
   * Triggered when a background or foregorund block is destroyed.
   */
  public async onDestroy(): Promise<void> {
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

    this.onDrop(destroyedItemID);

    const tank = TankPacket.from({
      type:   TankTypes.TILE_CHANGE_REQUEST,
      info:   18,
      xPunch: this.data.parent.x,
      yPunch: this.data.parent.y,
    });

    this.world.every((p) => {
      p.send(tank);
    });
  }

  public async onDrop(destroyedItemID: number) {
    const itemMeta = this.base.items.metadata.items.get(
      destroyedItemID.toString(),
    );
    if (!itemMeta) return;

    if (itemMeta.flags! & BlockFlags.PERMANENT) {
      const objectID = ++this.world.data.dropped.uidCount;
      const dropPkt = new TankPacket({
        type:        TankTypes.ITEM_CHANGE_OBJECT,
        netID:       -1,
        targetNetID: -1,
        info:        destroyedItemID,
        xPos:        this.data.parent.x * 32,
        yPos:        this.data.parent.y * 32,
      });
      const collectPkt = new TankPacket({
        type:        TankTypes.ITEM_CHANGE_OBJECT,
        netID:       this.peer.data.netID,
        targetNetID: -1,
        info:        objectID,
      });
      this.world.every((p) => {
        p.send(dropPkt, collectPkt);
      });
      this.peer.addItemInven(destroyedItemID);
      this.peer.sendConsoleMessage(`Collected \`w1 ${itemMeta.name}\`\`.\`\``);
      return;
    } else if (itemMeta.flags! & BlockFlags.DROPLESS) return;

    // Tried to find info about drop rates, here's an info on seeds: https://growtopia.fandom.com/wiki/Gems
    // https://www.growtopiagame.com/forums/forum/general/guidebook/273543-farming-calculator%E2%80%94estimate-seeds-gems-xp-with-formula-explanations
    // https://www.growtopiagame.com/forums/forum/general/guidebook/284860-beastly-s-calculator-hub/page12
    const rand = Math.random();
    if (rand <= 0.11) {
      // 1/9 chance
      this.world.drop(
        this.peer,
        this.data.parent.x * 32 + Math.floor(Math.random() * 16),
        this.data.parent.y * 32 + Math.floor(Math.random() * 16),
        itemMeta.id!,
        1,
        { tree: true },
      ); // block
      return;
    } else if (rand <= 0.33) {
      // 2/9 chance
      if (itemMeta.flags! & BlockFlags.SEEDLESS) return;
      this.world.drop(
        this.peer,
        this.data.parent.x * 32 + Math.floor(Math.random() * 16),
        this.data.parent.y * 32 + Math.floor(Math.random() * 16),
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

      this.calculateAndSpawnGems(itemMeta.rarity!);
    }
  }

  /**
   * Triggered when the peer tries to place item on a tile that already has block.
   * Placing any background item does not trigger this method. This method can be triggered by:
   * Placing seed on existing seed, Placing any block on existing display block, using consumables,
   * Placing clothes (weird way to wear clothes), Placing water, etc
   */
  public async onItemPlace(item: ItemDefinition): Promise<boolean> {
    if (
      !(await this.world.hasTilePermission(
        this.peer.data.userID,
        this.data,
        LockPermission.BUILD,
      ))
    ) {
      this.onPlaceFail();
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
   * @param damage damage to the tile
   * @param baseTankPkt You can provide your own TankPacket here. Fields that will be overidden are: `type`, `netID`, `info`, `xPunch`, and `yPunch`. (Optional)
   */
  public async applyDamage(
    damage: number,
    baseTankPkt?: TankPacket,
  ): Promise<void> {
    if (this.peer.data.world == this.world.worldName) {
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
      tank!.data!.netID = this.peer.data.netID;
      tank!.data!.info = damage;
      tank!.data!.xPunch = this.data.parent.x;
      tank!.data!.yPunch = this.data.parent.y;

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

  public async tileUpdate() {
    const serializedData = await this.parse();

    this.peer.send(
      TankPacket.from({
        type:   TankTypes.SEND_TILE_UPDATE_DATA,
        xPunch: this.data.parent.x,
        yPunch: this.data.parent.x,
        data:   () => serializedData.data,
      }),
    );
  }

  protected sendLockSound() {
    this.world.every((p) => {
      p.sendOnPlayPositioned("audio/punch_locked.wav", {
        netID: this.peer.data.netID,
      });
    });
  }

  private async sendAreaOwner(peer: Peer) {
    if (!(this.world.getOwnerUID() || this.data.lockedBy)) return;

    const ownerUserID =
      this.world.getOwnerUID() ??
      this.world.data.blocks[
        this.data.lockedBy!.parentY * this.world.data.width +
          this.data.lockedBy!.parentX
      ].lock!.ownerUserID;

    const ownerData = await this.base.database.player.getById(ownerUserID.toString());

    peer.sendTextBubble(
      `That area is owned by ${ownerData?.displayName}`,
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

  protected calculateAndSpawnGems(rarity: number) {
    const gemList = this.splitGemsDrop(this.randomizeGemsDrop(rarity));

    for (const gem of gemList) {
      this.world.drop(
        this.peer,
        this.data.parent.x * 32 + Math.floor(Math.random() * 16),
        this.data.parent.y * 32 + Math.floor(Math.random() * 16),
        112,
        gem,
        { tree: true, noSimilar: true },
      );
    }
  }
}
