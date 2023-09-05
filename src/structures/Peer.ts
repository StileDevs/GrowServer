import { Peer as OldPeer, TankPacket, TextPacket, Variant } from "growtopia.js";
import { PeerDataType } from "../types/peer";
import { Role, WORLD_SIZE } from "../utils/Constants";
import { DataTypes } from "../utils/enums/DataTypes";
import { TankTypes } from "../utils/enums/TankTypes";
import { BaseServer } from "./BaseServer";
import { World } from "./World";
import { ItemCollisionType } from "../utils/enums/Tiles";

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
        [this.data.clothing?.hair!, this.data.clothing?.shirt!, this.data.clothing?.pants!],
        [this.data.clothing?.feet!, this.data.clothing?.face!, this.data.clothing?.hand!],
        [this.data.clothing?.back!, this.data.clothing?.mask!, this.data.clothing?.necklace!],
        0x8295c3ff,
        [this.data.clothing?.ances!, 0.0, 0.0]
      )
    );

    this.everyPeer((p) => {
      if (
        p.data.world === this.data.world &&
        p.data.netID !== this.data.netID &&
        p.data.world !== "EXIT"
      ) {
        p.send(
          Variant.from(
            {
              netID: this.data.netID
            },
            "OnSetClothing",
            [this.data.clothing?.hair!, this.data.clothing?.shirt!, this.data.clothing?.pants!],
            [this.data.clothing?.feet!, this.data.clothing?.face!, this.data.clothing?.hand!],
            [this.data.clothing?.back!, this.data.clothing?.mask!, this.data.clothing?.necklace!],
            0x8295c3ff,
            [this.data.clothing?.ances!, 0.0, 0.0]
          )
        );
      }
    });
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
  public sound(file: string, delay: number = 100) {
    this.send(
      TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|${file}`, `delayMS|${delay}`)
    );
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
      return this.base.cache.worlds.getWorld(worldName)!;
    } else {
      let world = new World(this.base, worldName);
      return world;
    }
  }

  public respawn() {
    const world = this.hasWorld(this.data.world);
    const mainDoor = world?.data.blocks?.find((block) => block.fg === 6);

    this.send(
      Variant.from({ netID: this.data.netID }, "OnSetFreezeState", 1),
      Variant.from({ netID: this.data.netID }, "OnKilled"),
      Variant.from({ netID: this.data.netID, delay: 2000 }, "OnSetPos", [
        (mainDoor?.x! % WORLD_SIZE.WIDTH) * 32,
        (mainDoor?.y! % WORLD_SIZE.WIDTH) * 32
      ]),
      Variant.from({ netID: this.data.netID, delay: 2000 }, "OnSetFreezeState", 0)
    );

    this.sound("audio/teleport.wav", 2000);
  }

  public enterWorld(worldName: string, x?: number, y?: number) {
    const world = this.hasWorld(worldName);
    const mainDoor = world?.data.blocks?.find((block) => block.fg === 6);

    world?.enter(this, { x: x ? x : mainDoor?.x, y: y ? y : mainDoor?.y });
    this.inventory();
    this.sound("audio/door_open.wav");
  }

  public drop(id: number, amount: number) {
    if (this.data.world === "EXIT") return;

    const world = this.hasWorld(this.data.world);
    // world.getFromCache();

    const extra = Math.random() * 6;

    const x = this.data.x! + (this.data.rotatedLeft ? -25 : +25) + extra;
    const y = this.data.y! + extra - Math.floor(Math.random() * (3 - -1) + -3);

    world?.drop(this, x, y, id, amount);
  }

  public addItemInven(id: number, amount: number = 1) {
    const item = this.data.inventory?.items.find((i) => i.id === id);

    if (!item) this.data.inventory?.items.push({ id, amount });
    else if (item.amount < 200) item.amount += amount;

    // this.inventory();
    this.saveToCache();
  }

  public removeItemInven(id: number, amount: number = 1) {
    const item = this.data.inventory?.items.find((i) => i.id === id);

    if (item) {
      item.amount -= amount;
      if (item.amount < 1)
        this.data.inventory!.items = this.data.inventory!.items.filter((i) => i.id !== id);
    }

    // this.inventory();
    this.saveToCache();
  }

  public inventory() {
    const inventory = this.data.inventory!;

    this.send(
      TankPacket.from({
        type: TankTypes.PEER_INVENTORY,
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
}
