import { ItemDefinition, Peer as OldPeer, TankPacket, TextPacket, Variant } from "growtopia.js";
import type { PeerDataType, Block } from "../types";
import { Role, WORLD_SIZE } from "../utils/Constants.js";
import { DataTypes } from "../utils/enums/DataTypes.js";
import { TankTypes } from "../utils/enums/TankTypes.js";
import { BaseServer } from "./BaseServer.js";
import { World } from "./World.js";
import { ActionTypes } from "../utils/enums/Tiles.js";
import { manageArray } from "../utils/Utils.js";
import { Ability, ModsEffects, State } from "../utils/enums/Character.js";
import { Player } from "../tanks/Player.js";
import { ClothTypes, RiftCapeFlags, RiftWingsFlags } from "../utils/enums/ItemTypes.js";
import { Color } from "./Color.js";

export class Peer extends OldPeer<PeerDataType> {
  public base;

  constructor(base: BaseServer, netID: number) {
    super(base.server, netID);

    this.base = base;
  }

  public sendClothes() {
    this.send(
      Variant.from(
        {
          netID: this.data.netID
        },
        "OnSetClothing",
        [this.data.clothing.hair, this.data.clothing.shirt, this.data.clothing.pants],
        [this.data.clothing.feet, this.data.clothing.face, this.data.clothing.hand],
        [this.data.clothing.back, this.data.clothing.mask, this.data.clothing.necklace],
        0x8295c3ff,
        [this.data.clothing.ances, 0.0, 0.0]
      )
    );

    this.everyPeer((p) => {
      if (p.data?.world === this.data.world && p.data?.netID !== this.data.netID && p.data?.world !== "EXIT") {
        p.send(
          Variant.from(
            {
              netID: this.data.netID
            },
            "OnSetClothing",
            [this.data.clothing.hair, this.data.clothing.shirt, this.data.clothing.pants],
            [this.data.clothing.feet, this.data.clothing.face, this.data.clothing.hand],
            [this.data.clothing.back, this.data.clothing.mask, this.data.clothing.necklace],
            0x8295c3ff,
            [this.data.clothing.ances, 0.0, 0.0]
          )
        );
      }
    });
  }

  public equip_clothes(itemID: number) {
    if (!this.searchItem(itemID)) return;

    const isAnces = (item: ItemDefinition): boolean => {
      if (item?.type === ActionTypes.ANCES) {
        this.data.clothing.ances = itemID;
        return true;
      }
      return false;
    };

    if (this.data.clothing.hair === itemID || this.data.clothing.shirt === itemID
        || this.data.clothing.ances === itemID || this.data.clothing.back === itemID
        || this.data.clothing.face === itemID || this.data.clothing.feet === itemID
        || this.data.clothing.hand === itemID || this.data.clothing.mask === itemID
        || this.data.clothing.necklace === itemID || this.data.clothing.pants === itemID
    ) this.unequip(itemID);
    else {
      const item = this.base.items.metadata.items[itemID];
      if (!isAnces(item)) {
        switch (item?.bodyPartType) {
          case ClothTypes.ANCES: {
            this.data.clothing.ances = itemID;
            break;
          }
          case ClothTypes.BACK: {
            this.data.clothing.back = itemID;
            break;
          }
          case ClothTypes.FACE: {
            this.data.clothing.face = itemID;
            break;
          }
          case ClothTypes.FEET: {
            this.data.clothing.feet = itemID;
            break;
          }
          case ClothTypes.HAIR: {
            this.data.clothing.hair = itemID;
            break;
          }
          case ClothTypes.HAND: {
            this.data.clothing.hand = itemID;
            break;
          }
          case ClothTypes.MASK: {
            this.data.clothing.mask = itemID;
            break;
          }
          case ClothTypes.NECKLACE: {
            this.data.clothing.necklace = itemID;
            break;
          }
          case ClothTypes.PANTS: {
            this.data.clothing.pants = itemID;
            break;
          }
          case ClothTypes.SHIRT: {
            this.data.clothing.shirt = itemID;
            break;
          }
        }
      }
      const itemInfo = this.base.items.wiki.find((i) => i.id === itemID);
      if (itemInfo?.itemFunction[0]) {
        this.send(Variant.from("OnConsoleMessage", `${itemInfo.itemFunction[0]} (${itemInfo.playMod} added)`));

      }
      this.formState();
      this.sendClothes();
      this.send(
        TextPacket.from(DataTypes.ACTION, "action|play_sfx", "file|audio/change_clothes.wav", "delayMS|0")
      );
    }
  }

  public unequip(itemID: number) {
    const item = this.base.items.metadata.items[itemID];

    let unequiped: boolean = false;

    const isAnces = (item: ItemDefinition): boolean => {
      if (item?.type === ActionTypes.ANCES) {
        if (this.data.clothing.ances === itemID) this.data.clothing.ances = 0, unequiped = true;
        return true;
      }
      return false;
    };

    if (!isAnces(item)) {
      switch (item?.bodyPartType) {
        case ClothTypes.HAIR: {
          if (this.data.clothing.hair === itemID) this.data.clothing.hair = 0, unequiped = true;
          break;
        }
        case ClothTypes.SHIRT: {
          if (this.data.clothing.shirt === itemID) this.data.clothing.shirt = 0, unequiped = true;
          break;
        }
        case ClothTypes.PANTS: {
          if (this.data.clothing.pants === itemID) this.data.clothing.pants = 0, unequiped = true;
          break;
        }
        case ClothTypes.FEET: {
          if (this.data.clothing.feet === itemID) this.data.clothing.feet = 0, unequiped = true;
          break;
        }
        case ClothTypes.FACE: {
          if (this.data.clothing.face === itemID) this.data.clothing.face = 0, unequiped = true;
          break;
        }
        case ClothTypes.HAND: {
          if (this.data.clothing.hand === itemID) this.data.clothing.hand = 0, unequiped = true;
          break;
        }
        case ClothTypes.BACK: {
          if (this.data.clothing.back === itemID) this.data.clothing.back = 0, unequiped = true;
          break;
        }
        case ClothTypes.MASK: {
          if (this.data.clothing.mask === itemID) this.data.clothing.mask = 0, unequiped = true;
          break;
        }
        case ClothTypes.NECKLACE: {
          if (this.data.clothing.necklace === itemID) this.data.clothing.necklace = 0, unequiped = true;
          break;
        }
        case ClothTypes.ANCES: {
          if (this.data.clothing.ances === itemID) this.data.clothing.ances = 0, unequiped = true;
          break;
        }
      }
    }

    if (unequiped) {
      this.formState();
      this.sendClothes();
      this.send(
        TextPacket.from(DataTypes.ACTION, "action|play_sfx", "file|audio/change_clothes.wav", "delayMS|0")
      );
    }
    const itemInfo = this.base.items.wiki.find((i) => i.id === itemID);
    if (unequiped && itemInfo?.itemFunction[1]) {
      this.send(Variant.from("OnConsoleMessage", `${itemInfo.itemFunction[1]} (${itemInfo.playMod} removed)`));
    }
  }

  /** Extended version of setDataToCache */
  public saveToCache() {
    this.base.cache.users.setSelf(this.data.netID, this.data);
    return;
  }

  /** Extended version of setDataToDatabase */
  public async saveToDatabase() {
    return await this.base.database.saveUser(this.data);
  }

  public getSelfCache() {
    return this.base.cache.users.getSelf(this.data.netID);
  }
  public sound(file: string, delay = 100) {
    this.send(TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|${file}`, `delayMS|${delay}`));
  }

  public leaveWorld() {
    if (!this.data.world) return;

    const world = this.hasWorld(this.data.world);
    world?.leave(this);
  }

  public get name(): string {
    switch (this.data.role) {
      default: {
        return `\`w${this.data.tankIDName}\`\``;
      }
      case Role.SUPPORTER: {
        return `\`e${this.data.tankIDName}\`\``;
      }
      case Role.DEVELOPER: {
        return `\`b@${this.data.tankIDName}\`\``;
      }
    }
  }

  public everyPeer(callbackfn: (peer: Peer, netID: number) => void): void {
    this.base.cache.users.forEach((p, k) => {
      const pp = this.base.cache.users.getSelf(p.netID);
      callbackfn(pp, k);
    });
  }

  public hasWorld(worldName: string) {
    if (!worldName || worldName === "EXIT") return undefined;
    if (this.base.cache.worlds.has(worldName)) {
      return this.base.cache.worlds.getWorld(worldName);
    }

    const world = new World(this.base, worldName);
    return world;
  }

  public respawn() {
    const world = this.hasWorld(this.data.world);
    let mainDoor = world?.data.blocks.find((block) => block.fg === 6);

    if (this.data.lastCheckpoint) {
      const pos = this.data.lastCheckpoint.x + this.data.lastCheckpoint.y * (world?.data.width as number);
      const block = world?.data.blocks[pos];
      const itemMeta = this.base.items.metadata.items[(block?.fg as number) || (block?.bg as number)];

      if (itemMeta && itemMeta.type === ActionTypes.CHECKPOINT) {
        mainDoor = this.data.lastCheckpoint as Block; // only have x,y.
      } else {
        this.data.lastCheckpoint = undefined;
        this.send(Variant.from({ netID: this.data.netID, delay: 0 }, "SetRespawnPos", 0));
        mainDoor = world?.data.blocks?.find((block) => block.fg === 6);
      }
    } else {
      mainDoor = world?.data.blocks.find((block) => block.fg === 6);
    }

    this.send(
      Variant.from({ netID: this.data.netID }, "OnSetFreezeState", 1),
      Variant.from({ netID: this.data.netID }, "OnKilled"),
      Variant.from({ netID: this.data.netID, delay: 2000 }, "OnSetPos", [(mainDoor?.x || 0 % WORLD_SIZE.WIDTH) * 32, (mainDoor?.y || 0 % WORLD_SIZE.WIDTH) * 32]),
      Variant.from({ netID: this.data.netID, delay: 2000 }, "OnSetFreezeState", 0)
    );

    this.sound("audio/teleport.wav", 2000);
  }

  public async enterWorld(worldName: string, x?: number, y?: number) {
    const world = this.hasWorld(worldName);
    const mainDoor = world?.data.blocks?.find((block) => block.fg === 6);

    await world?.enter(this, { x: x ? x : mainDoor?.x, y: y ? y : mainDoor?.y });
    this.inventory();
    this.sound("audio/door_open.wav");
    this.checkModsEffect();

    this.data.lastVisitedWorlds = manageArray(this.data.lastVisitedWorlds!, 6, worldName);
  }

  public drop(id: number, amount: number) {
    if (this.data.world === "EXIT") return;

    const world = this.hasWorld(this.data.world);
    // world.getFromCache();

    const extra = Math.random() * 6;

    const x = (this.data.x as number) + (this.data.rotatedLeft ? -25 : +25) + extra;
    const y = (this.data.y as number) + extra - Math.floor(Math.random() * (3 - -1) + -3);

    world?.drop(this, x, y, id, amount);
  }

  public addItemInven(id: number, amount = 1, drop: boolean = false) {
    const item = this.data.inventory.items.find((i) => i.id === id);

    if (!item) {
      this.data.inventory.items.push({ id, amount });
      if (!drop) this.modifyInventory(id, amount);
    }
    else if (item.amount < 200) {
      if (item.amount + amount > 200) item.amount = 200;
      else item.amount += amount;
      if (!drop) this.modifyInventory(id, amount);
    }

    // this.inventory();
    this.saveToCache();
  }

  public removeItemInven(id: number, amount = 1) {
    const item = this.data.inventory.items.find((i) => i.id === id);

    if (item) {
      item.amount -= amount;
      if (item.amount < 1) {
        this.data.inventory.items = this.data.inventory.items.filter((i) => i.id !== id);
        if (this.base.items.metadata.items[id].bodyPartType !== undefined) {
          this.unequip(id);
        }
      }
    }

    this.modifyInventory(id, -amount);

    // this.inventory();
    this.saveToCache();
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

  public get country(): string {
    switch (this.data.role) {
      default: {
        return this.data.country;
      }
      case Role.DEVELOPER: {
        return "rt";
      }
    }
  }

  public countryState() {
    const country = (pe: Peer) => `${pe.country}|${pe.data.level >= 125 ? "maxLevel" : ""}`;

    this.send(Variant.from({ netID: this.data.netID }, "OnCountryState", country(this)));
    this.everyPeer((p) => {
      if (p.data.netID !== this.data.netID && p.data.world === this.data.world && p.data.world !== "EXIT") {
        p.send(Variant.from({ netID: this.data.netID }, "OnCountryState", country(this)));
        this.send(Variant.from({ netID: p.data.netID }, "OnCountryState", country(p)));
      }
    });
  }

  public sendEffect(eff: number, ...args: Variant[]) {
    this.everyPeer((p) => {
      if (p.data.world === this.data.world && p.data.world !== "EXIT") {
        p.send(Variant.from("OnParticleEffect", eff, [(this.data.x as number) + 10, (this.data.y as number) + 16]), ...args);
      }
    });
  }

  private hasPlaymod(name: string): boolean {
    const active_playmods = [];
    Object.keys(this.data.clothing).forEach((k) => {
      // @ts-expect-error ignore keys type
      const itemInfo = this.base.items.wiki.find((i) => i.id === this.data.clothing[k]);
      const playMod = itemInfo?.playMod || "";
      active_playmods.push(playMod);
    });

    if (this.data.state.canWalkInBlocks) active_playmods.push("Ghost in the Shell");

    for (let i = 0; i < active_playmods.length; i++) {
      if (active_playmods[i].length === 0) continue;

      if (active_playmods[i].toLowerCase().includes(name.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  private formState() {
    let state = 0x0;
    let mods_effect = 0x0;
    state |= (this.hasPlaymod("Ghost in the Shell") ? 1 : 0) << 0;
    if (Ability.DOUBLE_JUMP.some((k) => this.hasPlaymod(k))) state |= State.canDoubleJump;
    state |= (this.hasPlaymod("The One Ring") ? 1 : 0) << 2;
	  state |= (this.hasPlaymod("Mark of Growganoth") ? 1 : 0) << 4;
	  state |= (this.hasPlaymod("Halo!") ? 1 : 0) << 7;
	  state |= (this.hasPlaymod("duct tape") ? 1 : 0) << 13;
    state |= (this.hasPlaymod("Irradiated") ? 1 : 0) << 19;

    this.data.state.mod = state;

    if (this.hasPlaymod("Putt putt putt")) mods_effect |= ModsEffects.HARVESTER;
    if (Ability.PUNCH_DAMAGE.some((k) => this.hasPlaymod(k))) mods_effect |= ModsEffects.PUNCH_DAMAGE;

    this.data.state.modsEffect = mods_effect;
    this.sendState();
    this.addRift();
  }

  public sendState(punchID?: number, everyPeer = true) {
    const tank = TankPacket.from({
      type: TankTypes.SET_CHARACTER_STATE,
      netID: this.data.netID,
      info: this.data.state.mod,
      xPos: 1200,
      yPos: 200,
      xSpeed: 300,
      ySpeed: 600,
      xPunch: 0,
      yPunch: 0,
      state: 0
    }).parse() as Buffer;

    tank.writeUint8(punchID || 0x0, 5);
    tank.writeUint8(0x80, 6);
    tank.writeUint8(0x80, 7);
    tank.writeFloatLE(125.0, 20);

    if (this.data.state.modsEffect & ModsEffects.HARVESTER) {
      tank.writeFloatLE(150, 36);
      tank.writeFloatLE(1000, 40);
    }

    this.send(tank);
    if (everyPeer) {
      this.everyPeer((p) => {
        if (p.data.netID !== this.data.netID && p.data.world === this.data.world && p.data.world !== "EXIT") {
          p.send(tank);
        }
      });
    }
  }

  public checkModsEffect(withMsg = false, tank?: TankPacket) {
    let state = 0x0;
    let mods_effect = 0x0;

    // Clothing effects
    Object.keys(this.data.clothing).forEach((k) => {
      // @ts-expect-error ignore keys type
      const itemInfo = this.base.items.wiki.find((i) => i.id === this.data.clothing[k]);
      const playMod = itemInfo?.playMod || "";

      if (withMsg && tank) {
        if (itemInfo?.playMod) {
          if (itemInfo.id === tank.data?.info) {
            this.send(Variant.from("OnConsoleMessage", `${itemInfo?.itemFunction[0]} (\`$${itemInfo?.playMod || ""}\`\` mod added)`));
          }
        }
      }

      if (this.data.state.canWalkInBlocks) state |= State.canWalkInBlocks;

      if (Player.hasAbility(playMod, "DOUBLE_JUMP")) state |= State.canDoubleJump;
      if (Player.hasAbility(playMod, "HARVESTER") || itemInfo?.id === 1966 || itemInfo?.id === 1830 || itemInfo?.id === 9650) mods_effect |= ModsEffects.HARVESTER;
      if (Player.hasAbility(playMod, "PUNCH_DAMAGE")) mods_effect |= ModsEffects.PUNCH_DAMAGE;
    });

    this.data.state.mod = state;
    this.data.state.modsEffect = mods_effect;
    this.sendState();
    this.addRift();
  }

  public addRift() {
    // 10424 rift cape
    // 11478 rift wing

    let flags = 0;
    let variantType = "";

    if (this.data.clothing?.back === 10424) {
      flags |= RiftCapeFlags.CAPE_COLLAR_0;
      flags |= RiftCapeFlags.OPEN_ON_MOVE_0;
      flags |= RiftCapeFlags.AURA_0;
      flags |= RiftCapeFlags.AURA_1;
      flags |= RiftCapeFlags.AURA_3RD_0;
      flags |= RiftCapeFlags.AURA_1ST_1;
      flags |= RiftCapeFlags.TIME_CHANGE;
      variantType = "OnRiftCape";

      const capeColor = new Color(0, 0, 255).toDecimal();
      const colarColor = new Color(0, 255, 0).toDecimal();

      this.send(Variant.from({ netID: this.data.netID }, variantType, flags, capeColor, capeColor, colarColor, colarColor, 4));
    } else if (this.data.clothing?.back === 11478) {
      // still not working (trying figuring out how this work)
      flags |= RiftWingsFlags.OPEN_WING_0;
      flags |= RiftWingsFlags.TIME_CHANGE;

      variantType = "OnRiftWings";

      const capeColor = new Color(0, 0, 255).toDecimal();

      this.send(Variant.from({ netID: this.data.netID }, variantType, flags, capeColor, capeColor, 0, 0, 4));
    }
  }

  public addExp(amount: number): void {
    const required = 100 * (this.data.level * this.data.level + 4);

    this.data.exp += amount;

    if (this.data.level >= 125) {
      this.data.exp = required;
      return;
    }

    if (this.data.exp >= required) {
      this.data.exp = 0;
      this.data.level++;
      this.sendEffect(46);
      this.everyPeer((p) => {
        if (p.data.world === this.data.world && p.data.world !== "EXIT") {
          p.send(Variant.from("OnTalkBubble", this.data.netID, `${this.name} is now level ${this.data.level}!`), Variant.from("OnConsoleMessage", `${this.name} is now level ${this.data.level}!`));
        }
      });
      this.countryState();
    }
  }

  public modifyInventory(id: number, amount: number = 1) {
    if (amount > 200 || id <= 0 || id === 112) return;

    if (this.data.inventory?.items.find((i) => i.id === id)?.amount !== 0) {
      const tank = TankPacket.from({
        packetType: 4,
        type: TankTypes.MODIFY_ITEM_INVENTORY,
        info: id,
        buildRange: amount < 0 ? amount * -1 : undefined,
        punchRange: amount < 0 ? undefined : amount,
      }).parse() as Buffer;

      this.send(tank);
    }

    this.saveToCache();
    return 0;
  }

  public searchItem(id: number) {
    return this.data.inventory?.items.find((i) => i.id === id);
  }
}
