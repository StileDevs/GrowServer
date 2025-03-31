import { Block, PeerData } from "../types";
import {
  ItemDefinition,
  Peer as OldPeer,
  TankPacket,
  TextPacket,
  Variant
} from "growtopia.js";
import { Base } from "./Base";
import { World } from "./World";
import {
  ActionTypes,
  CLOTH_MAP,
  ClothTypes,
  PacketTypes,
  ROLE,
  TankTypes
} from "../Constants";
import { manageArray } from "../utils/Utils";

export class Peer extends OldPeer<PeerData> {
  public base;
  constructor(base: Base, netID: number, channelID = 0) {
    super(base.server, netID, channelID);
    this.base = base;

    const data = this.base.cache.peers.get(netID);
    if (data)
      this.data = {
        channelID,
        x:                 data.x,
        y:                 data.y,
        world:             data.world,
        inventory:         data.inventory,
        rotatedLeft:       data.rotatedLeft,
        requestedName:     data.requestedName,
        tankIDName:        data.tankIDName,
        netID,
        country:           data.country,
        id_user:           data.id_user,
        role:              data.role,
        gems:              data.gems,
        clothing:          data.clothing,
        exp:               data.exp,
        level:             data.level,
        lastCheckpoint:    data.lastCheckpoint,
        lastVisitedWorlds: data.lastVisitedWorlds,
        state:             data.state
      };
  }

  public async saveToCache() {
    this.base.cache.peers.set(this.data.netID, this.data);
    return true;
  }

  public async saveToDatabase() {
    return await this.base.database.players.save(this.data);
  }

  public get name(): string {
    switch (this.data.role) {
      default: {
        return `\`w${this.data.tankIDName}\`\``;
      }
      case ROLE.SUPPORTER: {
        return `\`e${this.data.tankIDName}\`\``;
      }
      case ROLE.DEVELOPER: {
        return `\`b@${this.data.tankIDName}\`\``;
      }
    }
  }

  public get country(): string {
    switch (this.data.role) {
      default: {
        return this.data.country;
      }
      case ROLE.DEVELOPER: {
        return "rt";
      }
    }
  }

  public every(callbackfn: (peer: Peer, netID: number) => void): void {
    this.base.cache.peers.forEach((p, k) => {
      const pp = new Peer(this.base, p.netID);
      callbackfn(pp, k);
    });
  }

  public respawn() {
    const world = this.currentWorld();
    if (!world) return;

    let mainDoor = world?.data.blocks.find((block) => block.fg === 6);

    if (this.data.lastCheckpoint) {
      const pos =
        this.data.lastCheckpoint.x +
        this.data.lastCheckpoint.y * (world?.data.width as number);
      const block = world?.data.blocks[pos];
      const itemMeta =
        this.base.items.metadata.items[
          (block?.fg as number) || (block?.bg as number)
        ];

      if (itemMeta && itemMeta.type === ActionTypes.CHECKPOINT) {
        mainDoor = this.data.lastCheckpoint as Block; // only have x,y.
      } else {
        this.data.lastCheckpoint = undefined;
        this.send(
          Variant.from({ netID: this.data.netID, delay: 0 }, "SetRespawnPos", 0)
        );
        mainDoor = world?.data.blocks?.find((block) => block.fg === 6);
      }
    } else {
      mainDoor = world?.data.blocks.find((block) => block.fg === 6);
    }

    this.send(
      Variant.from({ netID: this.data.netID }, "OnSetFreezeState", 1),
      Variant.from({ netID: this.data.netID }, "OnKilled"),
      Variant.from({ netID: this.data.netID, delay: 2000 }, "OnSetPos", [
        (mainDoor?.x || 0 % world.data.width) * 32,
        (mainDoor?.y || 0 % world.data.width) * 32
      ]),
      Variant.from(
        { netID: this.data.netID, delay: 2000 },
        "OnSetFreezeState",
        0
      )
    );

    this.sound("audio/teleport.wav", 2000);
  }

  public drop(id: number, amount: number) {
    if (this.data.world === "EXIT") return;

    const world = this.currentWorld();
    // world.getFromCache();

    const extra = Math.random() * 6;

    const x =
      (this.data.x as number) + (this.data.rotatedLeft ? -25 : +25) + extra;
    const y =
      (this.data.y as number) +
      extra -
      Math.floor(Math.random() * (3 - -1) + -3);

    world?.drop(this, x, y, id, amount);
  }

  public inventory() {
    const inventory = this.data.inventory;

    this.send(
      TankPacket.from({
        type: TankTypes.SEND_INVENTORY_STATE,
        data: () => {
          const buffer = Buffer.alloc(7 + inventory.items.length * 4);

          buffer.writeUInt8(0x1); // type?
          buffer.writeUInt32LE(inventory.max, 1);
          buffer.writeUInt16LE(inventory.items.length, 5);

          let offset = 7;

          inventory.items.forEach((item) => {
            buffer.writeUInt16LE(item.id, offset);
            buffer.writeUInt16LE(item.amount, offset + 2); // use bitwise OR (1 << 8) if item is equipped. could be wrong

            offset += 4;
          });

          return buffer;
        }
      })
    );
  }
  public sound(file: string, delay = 100) {
    this.send(
      TextPacket.from(
        PacketTypes.ACTION,
        "action|play_sfx",
        `file|${file}`,
        `delayMS|${delay}`
      )
    );
  }

  public currentWorld() {
    if (!this.data.world || this.data.world === "EXIT") return undefined;
    const world = this.base.cache.worlds.get(this.data.world);

    if (world) return new World(this.base, world.name);
    else return new World(this.base, this.data.world);
  }

  public leaveWorld() {
    if (!this.data.world) return;
    const world = this.currentWorld();
    world?.leave(this);
  }

  public async enterWorld(worldName: string, x?: number, y?: number) {
    this.data.world = worldName;

    const world = this.currentWorld();

    const mainDoor = world?.data.blocks?.find((block) => block.fg === 6);

    const xDoor = x ? x : (mainDoor?.x as number);
    const yDoor = y ? y : (mainDoor?.y as number);

    await world?.enter(this, xDoor, yDoor);
    this.inventory();
    this.sound("audio/door_open.wav");

    this.data.lastVisitedWorlds = manageArray(
      this.data.lastVisitedWorlds!,
      6,
      worldName
    );
  }

  /**
   * Used to make a visual modifying inventory
   */
  public modifyInventory(id: number, amount: number = 1) {
    if (amount > 200 || id <= 0 || id === 112) return;

    if (this.data.inventory?.items.find((i) => i.id === id)?.amount !== 0) {
      const tank = TankPacket.from({
        packetType: 4,
        type:       TankTypes.MODIFY_ITEM_INVENTORY,
        info:       id,
        buildRange: amount < 0 ? amount * -1 : undefined,
        punchRange: amount < 0 ? undefined : amount
      }).parse() as Buffer;

      this.send(tank);
    }

    this.saveToCache();
    return 0;
  }

  public addItemInven(id: number, amount = 1, drop: boolean = false) {
    const item = this.data.inventory.items.find((i) => i.id === id);

    if (!item) {
      this.data.inventory.items.push({ id, amount });
      if (!drop) this.modifyInventory(id, amount);
    } else if (item.amount < 200) {
      if (item.amount + amount > 200) item.amount = 200;
      else item.amount += amount;
      if (!drop) this.modifyInventory(id, amount);
    }

    // this.inventory();
    this.saveToCache();
  }

  public removeItemInven(id: number, amount = 1) {
    if (id === 0 || id === -1 || id === 32 || id === 18) {
      return;
    }
    const item = this.data.inventory.items.find((i) => i.id === id);

    if (item) {
      item.amount -= amount;
      if (item.amount < 1) {
        this.data.inventory.items = this.data.inventory.items.filter(
          (i) => i.id !== id
        );
        if (this.base.items.metadata.items[id].type === ActionTypes.CLOTHES) {
          this.unequipClothes(id);
        }
      }
    }

    this.modifyInventory(id, -amount);

    // this.inventory();
    this.saveToCache();
  }

  public searchItem(id: number) {
    return this.data.inventory?.items.find((i) => i.id === id);
  }

  public sendClothes() {
    this.send(
      Variant.from(
        {
          netID: this.data.netID
        },
        "OnSetClothing",
        [
          this.data.clothing.hair,
          this.data.clothing.shirt,
          this.data.clothing.pants
        ],
        [
          this.data.clothing.feet,
          this.data.clothing.face,
          this.data.clothing.hand
        ],
        [
          this.data.clothing.back,
          this.data.clothing.mask,
          this.data.clothing.necklace
        ],
        0x8295c3ff,
        [this.data.clothing.ances, 0.0, 0.0]
      )
    );

    this.every((p) => {
      if (
        p.data?.world === this.data.world &&
        p.data?.netID !== this.data.netID &&
        p.data?.world !== "EXIT"
      ) {
        p.send(
          Variant.from(
            {
              netID: this.data.netID
            },
            "OnSetClothing",
            [
              this.data.clothing.hair,
              this.data.clothing.shirt,
              this.data.clothing.pants
            ],
            [
              this.data.clothing.feet,
              this.data.clothing.face,
              this.data.clothing.hand
            ],
            [
              this.data.clothing.back,
              this.data.clothing.mask,
              this.data.clothing.necklace
            ],
            0x8295c3ff,
            [this.data.clothing.ances, 0.0, 0.0]
          )
        );
      }
    });
  }

  public equipClothes(itemID: number) {
    if (!this.searchItem(itemID)) return;

    const isAnces = (item: ItemDefinition): boolean => {
      if (item?.type === ActionTypes.ANCES) {
        this.data.clothing.ances = itemID;
        return true;
      }
      return false;
    };

    if (Object.values(this.data.clothing).includes(itemID))
      this.unequipClothes(itemID);
    else {
      const item = this.base.items.metadata.items[itemID];
      if (!isAnces(item)) {
        const clothKey = CLOTH_MAP[item?.bodyPartType as ClothTypes];

        if (clothKey) {
          this.data.clothing[clothKey] = itemID;
        }
      }
      const itemInfo = this.base.items.wiki.find((i) => i.id === itemID);
      // eslint-disable-next-line no-extra-boolean-cast
      if (!!itemInfo?.func?.add) {
        this.send(Variant.from("OnConsoleMessage", itemInfo.func.add));
      }
      // this.formState();
      this.sendClothes();
      this.send(
        TextPacket.from(
          PacketTypes.ACTION,
          "action|play_sfx",
          "file|audio/change_clothes.wav",
          "delayMS|0"
        )
      );
    }
  }

  public unequipClothes(itemID: number) {
    const item = this.base.items.metadata.items[itemID];

    let unequiped: boolean = false;

    const isAnces = (item: ItemDefinition): boolean => {
      if (item?.type === ActionTypes.ANCES) {
        if (this.data.clothing.ances === itemID) {
          this.data.clothing.ances = 0;
          unequiped = true;
          return true;
        }
      }
      return false;
    };

    if (!isAnces(item)) {
      const clothKey = CLOTH_MAP[item?.bodyPartType as ClothTypes];

      if (clothKey) {
        this.data.clothing[clothKey] = 0;
        unequiped = true;
      }
    }

    if (unequiped) {
      // this.formState();
      this.sendClothes();
      this.send(
        TextPacket.from(
          PacketTypes.ACTION,
          "action|play_sfx",
          "file|audio/change_clothes.wav",
          "delayMS|0"
        )
      );
    }
    const itemInfo = this.base.items.wiki.find((i) => i.id === itemID);
    // eslint-disable-next-line no-extra-boolean-cast
    if (!!itemInfo?.func?.rem) {
      this.send(Variant.from("OnConsoleMessage", itemInfo.func.rem));
    }
  }
  public isValid(): boolean {
    return this.data && this.data.netID !== undefined;
  }


  // Xp formulas sources: https://www.growtopiagame.com/forums/forum/general/guidebook/7120124-level-125-xp-calculator-and-data-updated-calculator
  // https://growtopia.fandom.com/wiki/Leveling
  // https://growtopia.fandom.com/wiki/User_blog:LightningWizardz/GROWTOPIA_FORMULA_(Rough_Calculation_Mode)
  public addXp(amount: number, bonus: boolean){
    const playerLvl = this.data.level;
    // check playmods
    // check bonuses
    this.data.exp += amount;
    if (this.data.exp >= this.calculateRequiredLevelXp(playerLvl)){
      this.data.level++;
      this.data.exp = 0;
      this.send(
        Variant.from(
          "OnTalkBubble",
          this.data.netID,
          this.name + " is now level " + this.data.level
        ),
        Variant.from(
          "OnConsoleMessage",
          this.data.netID,
          this.name + " is now level " + this.data.level + "!"
        )
      )
    } 
    this.saveToCache();
    this.saveToDatabase();
  }

  public calculateRequiredLevelXp(lvl: number): number{
    const requiredXp = 50 * ((lvl * lvl) + 2); 
    return requiredXp;
  }
}
