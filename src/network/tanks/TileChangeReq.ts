import { ItemDefinition, Tank, TankPacket, Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { Block } from "../../types";
import {
  ActionTypes,
  BlockFlags,
  LOCKS,
  ROLE,
  TankTypes
} from "../../Constants";
import { getWeatherId } from "../../utils/WeatherIds";
import consola from "consola";
import { Floodfill } from "../../utils/FloodFill";
import { Tile } from "../../world/Tile";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export class TileChangeReq {
  private pos: number;
  private block: Block;
  private itemMeta: ItemDefinition;
  private unbreakableBlocks = [8, 6, 3760, 7372];

  constructor(
    public base: Base,
    public peer: Peer,
    public tank: TankPacket,
    public world: World
  ) {
    this.pos =
            (this.tank.data?.xPunch as number) +
            (this.tank.data?.yPunch as number) * this.world.data.width;
    this.block = this.world.data.blocks[this.pos];
    this.itemMeta =
            this.base.items.metadata.items[this.block.fg || this.block.bg];
  }

  public async execute() {
    this.tank.data!.netID = this.peer.data?.netID;

    // Fist
    if (this.tank.data?.info === 18) {
      this.onFist();
    } else if (this.tank.data?.info === 32) {
      this.onTileWrench();
    }
    // Others
    else {
      this.onPlace();
    }
  }

  private checkOwner() {
    if (this.world.data.owner) {
      if (this.world.data.owner.id !== this.peer.data?.id_user) return false;
      if (this.peer.data?.role !== ROLE.DEVELOPER) return false;

      if (
        this.itemMeta.id === 242 &&
                this.world.data.owner.id !== this.peer.data?.id_user
      ) {
        this.peer.send(
          Variant.from(
            "OnTalkBubble",
            this.peer.data.netID,
            `\`#[\`0\`9World Locked by ${this.world.data.owner?.displayName}\`#]`
          )
        );
        return false;
      }

      return true;
    } else return true;
  }

  private async onTileWrench() {
    switch (this.itemMeta.type) {
      case ActionTypes.SIGN: {
        if (this.world.data.owner) {
          if (this.world.data.owner.id !== this.peer.data?.id_user) return;
        }
        const dialog = new DialogBuilder()
          .defaultColor()
          .addLabelWithIcon(
            `\`wEdit ${this.itemMeta.name}\`\``,
            this.itemMeta.id as number,
            "big"
          )
          .addTextBox("What would you like to write on this sign?")
          .addInputBox("label", "", this.block.sign?.label, 100)
          .embed("tilex", this.block.x)
          .embed("tiley", this.block.y)
          .embed("itemID", this.itemMeta.id)
          .endDialog("sign_edit", "Cancel", "OK")
          .str();

        this.peer.send(Variant.from("OnDialogRequest", dialog));
        break;
      }

      case ActionTypes.PORTAL:
      case ActionTypes.DOOR: {
        if (this.world.data.owner) {
          if (this.world.data.owner.id !== this.peer.data?.id_user) return;
        }
        const dialog = new DialogBuilder()
          .defaultColor()
          .addLabelWithIcon(
            `\`wEdit ${this.itemMeta.name}\`\``,
            this.itemMeta.id as number,
            "big"
          )
          .addInputBox("label", "Label", this.block.door?.label, 100)
          .addInputBox(
            "target",
            "Destination",
            this.block.door?.destination,
            24
          )
          .addSmallText("Enter a Destination in this format: `2WORLDNAME:ID``")
          .addSmallText(
            "Leave `2WORLDNAME`` blank (:ID) to go to the door with `2ID`` in the `2Current World``."
          )
          .addInputBox("id", "ID", this.block.door?.id, 11)
          .addSmallText(
            "Set a unique `2ID`` to target this door as a Destination from another!"
          )
          .embed("tilex", this.block.x)
          .embed("tiley", this.block.y)
          .embed("itemID", this.itemMeta.id)
          .endDialog("door_edit", "Cancel", "OK")
          .str();

        this.peer.send(Variant.from("OnDialogRequest", dialog));
        break;
      }

      case ActionTypes.LOCK: {
        const mLock = LOCKS.find((l) => l.id === this.itemMeta.id);

        if (mLock) {
          if (this.block.lock?.ownerUserID !== this.peer.data?.id_user) return;

          const dialog = new DialogBuilder()
            .defaultColor()
            .addLabelWithIcon(
              `\`wEdit ${this.itemMeta.name}\`\``,
              this.itemMeta.id as number,
              "big"
            )
            .embed("lockID", mLock.id)
            .embed("tilex", this.block.x)
            .embed("tiley", this.block.y)
            .addSmallText("Access list:")
          // bikin list user disini nanti
            .addSpacer("small")
            .addTextBox("Currently, you're the only one with access.")
            .raw("add_player_picker|playerNetID|`wAdd``|\n")
            .addCheckbox(
              "allow_break_build",
              "Allow anyone to Build and Break",
              this.block.lock?.openToPublic ? "selected" : "not_selected"
            )
            .addCheckbox(
              "ignore_empty",
              "Ignore empty air",
              this.block.lock?.ignoreEmptyAir ? "selected" : "not_selected"
            )
            .addButton("reapply_lock", "`wRe-apply lock``");

          if (this.itemMeta.id === 4994) {
            dialog
              .addSmallText(
                'This lock allows Building or Breaking.<CR>(ONLY if "Allow anyone to Build or Break" is checked above)!'
              )
              .addSpacer("small")
              .addSmallText("Leaving this box unchecked only allows Breaking.")
              .addCheckbox(
                "build_only",
                "Only Allow Building!",
                this.block.lock?.onlyAllowBuild ? "selected" : "not_selected"
              )
              .addSmallText(
                "People with lock access can both build and break unless you check below. The lock owner can always build and break."
              )
              .addCheckbox(
                "limit_admin",
                "Admins Are Limited",
                this.block.lock?.adminLimited ? "selected" : "not_selected"
              );
          }

          dialog.endDialog("area_lock_edit", "Cancel", "OK");

          this.peer.send(Variant.from("OnDialogRequest", dialog.str()));
        }

        break;
      }
    }
  }

  private async onPlace() {
    const placedItem = this.base.items.metadata.items.find(
      (i) => i.id === this.tank.data?.info
    );
    const mLock = LOCKS.find((l) => l.id === placedItem?.id);
    const mainLock = this.block.lock
      ? this.world.data.blocks[
        (this.block.lock.ownerX as number) +
            (this.block.lock.ownerY as number) * this.world.data.width
      ]
      : null;

    if (!placedItem || !placedItem.id) return;
    if (this.tank.data?.info === 18 || this.tank.data?.info === 32) return;

    if (this.world.data.owner) {
      if (!mLock && placedItem.type === ActionTypes.LOCK) {
        this.sendLockSound();
        return;
      }
      if (this.world.data.owner.id !== this.peer.data?.id_user) {
        if (this.peer.data?.role !== ROLE.DEVELOPER) {
          this.sendLockSound();
          return;
        }
      }
    } else {
      if (this.peer.data?.role !== ROLE.DEVELOPER) {
        if (
          mainLock &&
                    mainLock.lock?.ownerUserID !== this.peer.data?.id_user
        ) {
          this.sendLockSound();
          return;
        }
      }
    }

    if (
      this.unbreakableBlocks.includes(placedItem.id) &&
            this.peer.data?.role !== ROLE.DEVELOPER
    ) {
      this.sendLockSound();
      return;
    }

    if (this.block.fg === 2946) this.displayBlockPlace();

    if ((this.itemMeta?.id ?? 0) - 1 !== placedItem.id - 1) {

      if (this.block.tree) {

        const searchIds = [placedItem.id - 1, (this.itemMeta?.id ?? 0) - 1];

        const foundItem = this.base.items.wiki.find(item => {

          const spliceArray = item.recipe?.splice;
          const bothIdsFound = spliceArray && searchIds.every(id => spliceArray.includes(id));

          //if (bothIdsFound) {
          //  console.log(`Item ${item.name} has both IDs: ${searchIds}`);
          //}
          return bothIdsFound;

        }) || null;

        const foundItemId = foundItem ? foundItem.id + 1 : 0;

        if (foundItemId !== 0) {
          this.peer.removeItemInven(this.tank.data?.info as number, 1);
        }

        const placedItemFound = this.base.items.metadata.items.find(
          (i) => i.id === foundItemId
        );

        if (placedItemFound && placedItemFound.id !== 0) {
          this.onFistDestroyedTree();

          await this.onPlaced(placedItemFound ?? placedItem);
          //if (placed) {
          //this.peer.removeItemInven(this.tank.data?.info as number, 1); // this code is unreachable, when placed is true it goes to onPlaced
          //}
        }
      } else {
        await this.onPlaced(placedItem);
      }
    }
    this.peer.inventory();
    this.peer.saveToCache();
    return;
  }

  private async displayBlockPlace() {
    const placedItem = this.base.items.metadata.items.find(
      (i) => i.id === this.tank.data?.info
    );

    this.block.dblockID = placedItem?.id;

    this.peer.removeItemInven(this.tank.data?.info as number, 1);
    await Tile.tileUpdate(
      this.base,
      this.peer,
      this.world,
      this.block,
      ActionTypes.DISPLAY_BLOCK
    );
  }

  private async onPlaced(placedItem: ItemDefinition) {
    const flags = placedItem.flags as number;
    const actionType = placedItem.type as number;
    if (this.tank.data?.info as number !== 32 || this.tank.data?.info as number !== 18 || this.tank.data?.info as number !== 0) {
      this.peer.removeItemInven(this.tank.data?.info as number, 1);
    }
    const isBg =
            this.base.items.metadata.items[this.tank.data?.info as number].type ===
            ActionTypes.BACKGROUND ||
            this.base.items.metadata.items[this.tank.data?.info as number].type ===
            ActionTypes.SHEET_MUSIC;

    if (this.block.fg === 2946 && actionType !== ActionTypes.DISPLAY_BLOCK)
      return false;

    if (this.block.fg && flags & BlockFlags.WRENCHABLE) return false;
    if (this.block.fg && !this.block.bg) return false;
    if (this.block.fg && actionType === ActionTypes.PLATFORM) return false;

    const placeBlock = (fruit?: number) =>
      this.world.place(
        this.peer,
        this.block.x,
        this.block.y,
        placedItem.id as number,
        isBg,
        fruit
      );
    switch (actionType) {
      case ActionTypes.SHEET_MUSIC:
      case ActionTypes.BEDROCK:
      case ActionTypes.LAVA:
      case ActionTypes.PLATFORM:
      case ActionTypes.FOREGROUND:
      case ActionTypes.BOOMBOX:
      case ActionTypes.FOREGROUND_WITH_EXTRA_FRAME:
      case ActionTypes.PHASED_BLOCK:
      case ActionTypes.PHASED_BLOCK_2:
      case ActionTypes.BACKGROUND: {
        placeBlock();
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          placedItem.type as number
        );
        return true;
      }

      case ActionTypes.PORTAL:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        this.block.door = {
          label:       "",
          destination: "",
          id:          "",
          locked:      false
        };
        placeBlock();
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          placedItem.type as number
        );

        return true;
      }

      case ActionTypes.HEART_MONITOR: {
        this.block.heartMonitor = {
          name:   this.peer.data.tankIDName,
          userID: parseInt(this.peer.data.id_user as string)
        };
        placeBlock();
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          placedItem.type as number
        );
        return true;
      }

      case ActionTypes.DISPLAY_BLOCK: {
        this.block.dblockID = 0;
        placeBlock();
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          placedItem.type as number
        );
        return true;
      }

      case ActionTypes.DICE: {
        this.block.dice = 0;
        placeBlock();
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          placedItem.type as number
        );
        return true;
      }

      case ActionTypes.WEATHER_MACHINE:
      case ActionTypes.SWITCHEROO: {
        this.block.toggleable = {
          open:   false,
          public: false
        };
        placeBlock();
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          placedItem.type as number
        );
        return true;
      }

      case ActionTypes.LOCK: {
        const mLock = LOCKS.find((l) => l.id === placedItem.id);

        if (mLock) {
          if (this.block.lock) {
            this.peer.send(
              Variant.from(
                "OnTalkBubble",
                this.peer.data.netID,
                "This area is `4already locked``",
                0,
                1
              )
            );
            return false;
          }

          if (
            typeof this.world.data.owner?.id === "number" &&
                        this.world.data.owner.id !== this.peer.data?.id_user
          ) {
            this.peer.send(
              Variant.from(
                "OnTalkBubble",
                this.peer.data.netID,
                "The tile owner `2allows`` public building but `4not`` for this specific block.",
                0,
                1
              )
            );
            return false;
          }

          this.world.place(
            this.peer,
            this.block.x,
            this.block.y,
            placedItem.id as number,
            isBg
          );

          const algo = new Floodfill({
            s_node:     { x: this.block.x, y: this.block.y },
            max:        mLock.maxTiles,
            width:      this.world.data.width,
            height:     this.world.data.height,
            blocks:     this.world.data.blocks,
            s_block:    this.block,
            base:       this.base,
            noEmptyAir: false
          });

          algo.exec();
          algo.apply(this.world, this.peer);
          this.peer.send(
            Variant.from(
              "OnTalkBubble",
              this.peer.data.netID,
              "Area locked.",
              0,
              1
            )
          );

          return true;
        }
        if (
          this.world.data.blocks?.find(
            (b) =>
              b.lock?.ownerUserID &&
                            b.lock.ownerUserID !== this.peer.data?.id_user
          )
        ) {
          this.peer.send(
            Variant.from(
              "OnTalkBubble",
              this.peer.data.netID,
              "Can't put lock, there's other locks around here.",
              0,
              1
            )
          );
          return false;
        }

        if (this.block.x === 0 && this.block.y === 0) {
          this.peer.send(
            Variant.from(
              "OnTalkBubble",
              this.peer.data.netID,
              "You `4cannot`` place locks over here!",
              0,
              1
            )
          );
          return false;
        }

        this.block.worldLock = true;
        if (!this.block.lock) {
          this.block.lock = {
            ownerUserID: this.peer.data?.id_user as number
          };
        }
        this.world.data.owner = {
          id:          this.peer.data?.id_user as number,
          name:        this.peer.data?.tankIDName as string,
          displayName: this.peer.name
        };

        this.world.data.bpm = 100;

        this.peer.every((pa) => {
          if (
            pa.data?.world === this.peer.data?.world &&
                        pa.data?.world !== "EXIT"
          )
            pa.send(
              Variant.from(
                "OnTalkBubble",
                this.peer.data.netID,
                `\`3[\`w${this.world.worldName} \`ohas been World Locked by ${this.peer.name}\`3]`
              ),
              Variant.from(
                "OnConsoleMessage",
                `\`3[\`w${this.world.worldName} \`ohas been World Locked by ${this.peer.name}\`3]`
              ),
              Variant.from(
                { netID: this.peer.data?.netID },
                "OnPlayPositioned",
                "audio/use_lock.wav"
              )
            );
        });

        placeBlock();
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          placedItem.type as number
        );
        return true;
      }

      case ActionTypes.SEED: {
        if (this.block.fg !== 0) return false;

        const id = placedItem?.id as number;
        const item = this.base.items.metadata.items[id];
        const fruitCount =
                    Math.floor(Math.random() * 10 * (1 - (item.rarity || 0) / 1000)) + 1;
        const now = Date.now();

        //this.peer.send(Variant.from("OnConsoleMessage", `\`2Placed Item Id ${this.itemMeta.id}`));

        this.block.tree = {
          fruit:        id - 1,
          fruitCount,
          fullyGrownAt: (this.block.tree?.plantedAt ?? now) + (item.growTime || 0) * 1000,
          plantedAt:    now
        };

        placeBlock(fruitCount > 4 ? 4 : fruitCount);
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          placedItem.type as number
        );
        break;
      }

      default: {
        consola.debug("Unknown block placing", this.block, placedItem);
        return false;
      }
    }
  }

  private async onFist() {
    if (!this.itemMeta.id) return;
    if (!this.checkOwner()) return this.sendLockSound();
    if (
      typeof this.block.damage !== "number" ||
            (this.block.resetStateAt as number) <= Date.now()
    )
      this.block.damage = 0;
    if (
      this.unbreakableBlocks.includes(this.itemMeta.id) &&
            this.peer.data?.role !== ROLE.DEVELOPER
    ) {
      this.peer.send(
        Variant.from(
          "OnTalkBubble",
          this.peer.data.netID,
          "It's too strong to break."
        )
      );
      this.sendLockSound();
      return;
    }

    if ((this.block.damage as number) >= (this.itemMeta.breakHits as number)) {
      this.onFistDestroyed();
    } else {
      this.onFistDamaged();
    }

    this.peer.send(this.tank);
    this.world.saveToCache();
    this.peer.every((p) => {
      if (
        p.data?.netID !== this.peer.data?.netID &&
                p.data?.world === this.peer.data?.world &&
                p.data?.world !== "EXIT"
      ) {
        p.send(this.tank);
      }
    });
  }

  // If you will want to drop gems on the floor use the following code (fix is required)
  //public splitGems(num: number) {
  //  const gemValues = {
  //    yellow: 1,
  //    blue:   5,
  //    red:    10,
  //    green:  50,
  //    purple: 100
  //  };

  //  const values = [];

  //  for (const [gemName, gemValue] of Object.entries(gemValues).sort((a, b) => b[1] - a[1])) {
  //    const maxGems = Math.floor(num / gemValue);
  //    values.push(...Array(maxGems).fill(gemValue));
  //    num -= maxGems * gemValue;
  //    if (num === 0) {
  //      break;
  //    }
  //  }

  //  return values;
  //}

  //public dropRandomGems(min: number, max: number, block: Block) {
  //  const randGems = Math.floor(Math.random() * (max - min + 1)) + min;
  //  const arrGems = this.splitGems(randGems);

  //  arrGems.forEach((v) => {
  //    const extra = Math.random() * 6;

  //    const x = (block.x as number) * 32 + extra;
  //    const y = (block.y as number) * 32 + extra - Math.floor(Math.random() * (3 - -1) + -3);
  //    this.world.drop(this.peer, x, y, 112, v, { tree: true, noSimilar: true });
  //  });
  //}

  private onFistDestroyed() {
    const placedItem = this.base.items.metadata.items.find(
      (i) => i.id === this.tank.data?.info
    );
    if (!placedItem || !placedItem.id) return;

    this.block.damage = 0;
    this.block.resetStateAt = 0;

    if (this.block.fg) this.block.fg = 0;
    else if (this.block.bg) this.block.bg = 0;

    (this.tank.data as Tank).type = TankTypes.TILE_CHANGE_REQUEST;
    (this.tank.data as Tank).info = 18;

    this.block.rotatedLeft = undefined;
    this.peer.addXp(Math.max(1, Math.round((this.itemMeta.rarity ?? 0) / 5)) * 5 / 5, false);
    this.world.drop(
      this.peer,
      this.block.x * 32 + Math.floor(Math.random() * 16),
      this.block.y * 32 + Math.floor(Math.random() * 16),
      this.randomizeDrop(this.itemMeta.id ?? - 1) ?? 0,
      1,
      { tree: true }
    );

    this.calculateGemDrop();

    switch (this.itemMeta.type) {
      case ActionTypes.PORTAL:
      case ActionTypes.DOOR:
      case ActionTypes.MAIN_DOOR: {
        this.block.door = undefined;
        break;
      }

      case ActionTypes.SIGN: {
        this.block.sign = undefined;
        break;
      }

      case ActionTypes.DEADLY_BLOCK: {
        this.block.dblockID = undefined;
        break;
      }

      case ActionTypes.HEART_MONITOR: {
        this.block.heartMonitor = undefined;
        break;
      }

      case ActionTypes.SWITCHEROO: {
        this.block.toggleable = undefined;
        break;
      }

      case ActionTypes.WEATHER_MACHINE: {
        this.block.toggleable = undefined;

        this.world.data.weatherId = 41;
        this.peer.every((p) => {
          if (
            this.peer.data.world === p.data.world &&
                        p.data.world !== "EXIT"
          ) {
            p.send(
              Variant.from("OnSetCurrentWeather", this.world.data.weatherId)
            );
          }
        });
        break;
      }

      case ActionTypes.LOCK: {
        if (LOCKS.find((l) => l.id === this.itemMeta.id)) {
          this.world.data.blocks?.forEach((b) => {
            if (
              b.lock &&
                            b.lock.ownerX === this.block.x &&
                            b.lock.ownerY === this.block.y
            )
              b.lock = undefined;
          });
        } else {
          this.block.worldLock = undefined;
          this.block.lock = undefined;
          this.world.data.owner = undefined;

          Tile.tileUpdate(
            this.base,
            this.peer,
            this.world,
            this.block,
            placedItem.type as number
          );
        }
        break;
      }
    }
  }

  private onFistDestroyedTree() {
    const placedItem = this.base.items.metadata.items.find(
      (i) => i.id === this.tank.data?.info
    );
    if (!placedItem || !placedItem.id) return;

    this.block.damage = 0;
    this.block.resetStateAt = 0;

    if (this.block.fg) this.block.fg = 0;
    else if (this.block.bg) this.block.bg = 0;

    (this.tank.data as Tank).type = TankTypes.TILE_CHANGE_REQUEST;
    (this.tank.data as Tank).info = 18;

    this.calculateGemDrop()

    this.block.rotatedLeft = undefined;

    this.block.tree = undefined;
    this.block.fg = 0x0;

    this.peer.every(
      (p) =>
        p.data?.world === this.peer.data?.world &&
                p.data?.world !== "EXIT" &&
                p.send(
                  TankPacket.from({
                    type:        TankTypes.SEND_TILE_TREE_STATE,
                    netID:       this.peer.data?.netID,
                    targetNetID: -1,
                    xPunch:      this.block.x,
                    yPunch:      this.block.y
                  })
                )
    );
  }

  private calculateGemDrop() {
    const rarity = this.itemMeta.rarity as number;
    if (rarity <= 998) {
      //this.peer.addExp(rarity / 5 > 0 ? rarity / 5 : 1);
    }

    // used Kukuri's code for gems drop https://discord.com/channels/617041217951236291/1109350502975676536/1322578761102917663
    const amount = this.randomizeGemsDrop(rarity);
    if (amount === 0) return;

    if (isNaN(amount) || amount < 0) {
      return this.peer.send(Variant.from("OnConsoleMessage", "`4Invalid amount. Please specify a positive number.`"));
    }

    const targetPlayer = this.peer.data;

    if (targetPlayer) {

      targetPlayer.gems += amount;
      this.peer.send(Variant.from("OnConsoleMessage", `\`2Collected ${amount} gems`));

      if (targetPlayer !== this.peer.data) {
        const targetPeer = new Peer(this.base, targetPlayer?.netID);
        console.log("Successfully added gems");
        targetPeer.send(Variant.from("OnConsoleMessage", `\`2${this.peer.data.tankIDName} has added ${amount} gems to your account. You now have ${targetPlayer.gems} gems.`));
      }

      this.peer.send(Variant.from("OnSetBux", this.peer.data.gems));

      this.peer.saveToCache();
      this.peer.saveToDatabase();

    }
  }

  // Trying to add more gems, because https://growtopia.fandom.com/wiki/Chandelier
  // some items may drop more than gem calculation based on rarity
  private randomizeGemsDrop(rarity: number) {
    const max = Math.random();
    let bonus = 0;
    const threshold = Math.min(0.1 + (rarity / 100), 0.5); // Linear increase, caps on 0.5
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

  // Tried to find info about drop rates, here's an info on seeds: https://growtopia.fandom.com/wiki/Gems
  // https://www.growtopiagame.com/forums/forum/general/guidebook/273543-farming-calculator%E2%80%94estimate-seeds-gems-xp-with-formula-explanations
  // https://www.growtopiagame.com/forums/forum/general/guidebook/284860-beastly-s-calculator-hub/page12
  private randomizeDrop(id: number) {
    if (id === -1) {
      return 0; // was -1. block with id -1 can drop but when you will enter world with this dropped -1 id block it will throw an error 
    }
    const rand = Math.random();
    if (rand <= 0.33) {        // 2/9 chance
      return id + 1;           // seed
    } else if (rand <= 0.21) { // 1/9 chance
      return id;               // block
    } else {
      return 0;
    }
  }

  private onFistDamaged() {
    const placedItem = this.base.items.metadata.items.find(
      (i) => i.id === this.tank.data?.info
    );
    if (!placedItem || !placedItem.id) return;

    (this.tank.data as Tank).type = TankTypes.TILE_APPLY_DAMAGE;
    (this.tank.data as Tank).info = (this.block.damage as number) + 5;

    this.block.resetStateAt =
            Date.now() + (this.itemMeta.resetStateAfter as number) * 1000;
    // satisfies type
    (this.block.damage as number) += 1;

    switch (this.itemMeta.type) {
      case ActionTypes.SEED: {
        this.peer.addXp(((Math.round(this.itemMeta.rarity ?? 0 / 5) * 5 ) / 5), false);
        this.world.harvest(this.peer, this.block);
        break;
      }

      case ActionTypes.SWITCHEROO: {
        if (this.block.toggleable)
          this.block.toggleable.open = !this.block.toggleable.open;
        Tile.tileUpdate(
          this.base,
          this.peer,
          this.world,
          this.block,
          this.itemMeta.type as number
        );

        break;
      }

      case ActionTypes.WEATHER_MACHINE: {
        let weatherId = getWeatherId(this.itemMeta.id as number);
        if (this.world.data.weatherId === weatherId) weatherId = 41; // to-do add: world.data.baseWeatherId

        this.world.data.weatherId = weatherId;

        this.peer.every((p) => {
          if (
            this.peer.data.world === p.data.world &&
                        p.data.world !== "EXIT"
          ) {
            p.send(
              Variant.from("OnSetCurrentWeather", this.world.data.weatherId)
            );
          }
        });
        this.world.saveToCache();
        break;
      }

      case ActionTypes.DICE: {
        this.block.dice = Math.floor(Math.random() * 6);
        const tankData = this.tank.data as Tank;

        tankData.xPos = this.peer.data.x;
        tankData.yPos = this.peer.data.y;
        tankData.targetNetID = this.peer.data.clothing.hand;
        tankData.state = 16;
        tankData.info = 7;

        const diceTank = this.tank.parse() as Buffer;

        diceTank.writeUint8(this.block.dice, 4 + 3);

        this.tank = TankPacket.fromBuffer(diceTank);
        break;
      }
    }
  }

  private sendLockSound() {
    this.peer.every((p) => {
      if (p.data?.world === this.peer.data?.world && p.data?.world !== "EXIT")
        p.send(
          Variant.from(
            { netID: this.peer.data?.netID },
            "OnPlayPositioned",
            "audio/punch_locked.wav"
          )
        );
    });
  }
}
