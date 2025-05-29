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
  CharacterState,
  CLOTH_MAP,
  ClothTypes,
  ModsEffects,
  NameStyles,
  PacketTypes,
  ROLE,
  TankTypes
} from "../Constants";
import { getCurrentTimeInSeconds, manageArray } from "../utils/Utils";

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

  public countryState() {
    const country = (pe: Peer) => `${pe.country}|${pe.data.level >= 125 ? NameStyles.MAX_LEVEL : ""}`;

    this.send(Variant.from({ netID: this.data.netID }, "OnCountryState", country(this)));
    this.every((p) => {
      if (p.data.netID !== this.data.netID && p.data.world === this.data.world && p.data.world !== "EXIT") {
        p.send(Variant.from({ netID: this.data.netID }, "OnCountryState", country(this)));
        this.send(Variant.from({ netID: p.data.netID }, "OnCountryState", country(p)));
      }
    });
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
    this.countryState();
    this.sound("audio/door_open.wav");
    this.formPlayMods();

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


  // Check every clothes playmods & apply it
  public formPlayMods() {
    let charActive = 0;
    const modActive = 0;

    Object.keys(this.data.clothing).forEach((k) => {
      const itemInfo = this.base.items.wiki.find((i) => i.id === this.data.clothing[k]);
      const playMods = itemInfo?.playMods || [];

      for (const mod of playMods) {
        const name = mod.toLowerCase();
        if (name.includes("double jump")) charActive |= CharacterState.DOUBLE_JUMP;
      }
    });

    this.data.state.mod = charActive;
    this.data.state.modsEffect = modActive;

    this.sendState();
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
      this.formPlayMods();
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
      this.formPlayMods();
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

  public sendEffect(eff: number, ...args: Variant[]) {
    this.every((p) => {
      if (p.data.world === this.data.world && p.data.world !== "EXIT") {
        p.send(Variant.from("OnParticleEffect", eff, [(this.data.x as number) + 10, (this.data.y as number) + 16]), ...args);
      }
    });
  }

  public sendState(punchID?: number, everyPeer = true) {
    const tank = TankPacket.from({
      type:   TankTypes.SET_CHARACTER_STATE,
      netID:  this.data.netID,
      info:   this.data.state.mod,
      xPos:   1200,
      yPos:   200,
      xSpeed: 300,
      ySpeed: 600,
      xPunch: 0,
      yPunch: 0,
      state:  0
    }).parse() as Buffer;

    tank.writeUint8(punchID || 0x0, 5);
    tank.writeUint8(0x80, 6);
    tank.writeUint8(0x80, 7);
    tank.writeFloatLE(125.0, 20);

    // if (this.data.state.modsEffect & ModsEffects.HARVESTER) {
    //   tank.writeFloatLE(150, 36);
    //   tank.writeFloatLE(1000, 40);
    // }

    this.send(tank);
    if (everyPeer) {
      this.every((p) => {
        if (p.data.netID !== this.data.netID && p.data.world === this.data.world && p.data.world !== "EXIT") {
          p.send(tank);
        }
      });
    }
  }


  // Xp formulas sources: https://www.growtopiagame.com/forums/forum/general/guidebook/7120124-level-125-xp-calculator-and-data-updated-calculator
  // https://growtopia.fandom.com/wiki/Leveling
  // https://growtopia.fandom.com/wiki/User_blog:LightningWizardz/GROWTOPIA_FORMULA_(Rough_Calculation_Mode)
  public addXp(amount: number, bonus: boolean) {
    const playerLvl = this.data.level;
    const requiredXp = this.calculateRequiredLevelXp(playerLvl);
    
    // Max level is 125
    if (this.data.level >= 125) {
      this.data.exp = 0;
      return;
    }

    // check playmods
    // check bonuses
    this.data.exp += amount;
    if (this.data.exp >= requiredXp) {
      this.data.level++;
      this.data.exp = 0;
      this.sendEffect(46);
      this.every((p) => {
        if (p.data.world === this.data.world && p.data.world !== "EXIT") {
          p.send(Variant.from("OnTalkBubble", this.data.netID, `${this.name} is now level ${this.data.level}!`), Variant.from("OnConsoleMessage", `${this.name} is now level ${this.data.level}!`));
        }
      });
    }
    this.countryState();
    this.saveToCache();
  }

  public calculateRequiredLevelXp(lvl: number): number{
    const requiredXp = 50 * ((lvl * lvl) + 2); 
    return requiredXp;
  }

  /**
   * Updates the current peer's gem (bux) amount and update the timestamp chat.
   *
   * This method sends a Variant packet to the client to update the displayed gem count,
   * control animation, and optionally indicate supporter status (maybe). It also updates the
   * timestamp used for console chat.
   *
   * @param amount - The new gem (bux) amount to set for the player.
   * @param skip_animation - Whether to skip the gem animation (0 = show animation, 1 = skip animation). Default is 0.
   *
   * ### OnSetBux Packet Structure:
   * - Param 1: `number` — The gem (bux) amount.
   * - Param 2: `number` — Animation flag.
   * - Param 3: `number` — Supporter status.
   * - Param 4: `number[]` — Additional data array:
   *   - `[0]`: `number` (float) — Current timestamp in seconds (used for console chat).
   *   - `[1]`: `number` (float) — Reserved, typically 0.00.
   *   - `[2]`: `number` (float) — Reserved, typically 0.00.
   *
   * @example
   * // Set gems to 1000, show animation
   * peer.setGems(1000);
   *
   * // Set gems to 500 and skip animation
   * peer.setGems(500, 1);
   */
  public setGems(amount: number, skip_animation: number = 0) {
    this.send(Variant.from("OnSetBux", amount, skip_animation, 0, [getCurrentTimeInSeconds(), 0.00, 0.00])); // Param 2 maybe for supporter status?
  }
}
