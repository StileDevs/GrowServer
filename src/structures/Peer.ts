import { Peer as OldPeer, Server, TankPacket, TextPacket, Variant } from "growsockets";
import { PeerDataType } from "../types/peer";
import { Role, WORLD_SIZE } from "../utils/Constants";
import { DataTypes } from "../utils/enums/DataTypes";
import { TankTypes } from "../utils/enums/TankTypes";
import { BaseServer } from "./BaseServer";
import { World } from "./World";

export class Peer extends OldPeer<PeerDataType> {
  public base;

  constructor(server: Server<unknown, unknown, unknown>, netID: number, base: BaseServer) {
    super(server, netID);

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
    this.base.cache.users.set(this.data.netID, this);
    return;
  }

  /** Extended version of setDataToDatabase */
  public async saveToDatabase() {
    return await this.base.database.saveUser(this.data);
  }

  public getSelfCache() {
    return this.base.cache.users.get(this.data.netID);
  }

  public sound(file: string, delay: number = 100) {
    this.send(
      TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|${file}`, `delayMS|${delay}`)
    );
  }

  public leaveWorld() {
    const world = this.hasWorld(this.data.world);
    world.leave(this);
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
      callbackfn(p, k);
    });
  }

  public hasWorld(worldName: string) {
    if (this.base.cache.worlds.has(worldName)) {
      return this.base.cache.worlds.get(worldName)!;
    } else {
      let world = new World(this.base, worldName);
      return world;
    }
  }

  public respawn() {
    const world = this.hasWorld(this.data.world);
    const mainDoor = world.data.blocks?.find((block) => block.fg === 6);

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
    const mainDoor = world.data.blocks?.find((block) => block.fg === 6);

    world.enter(this, { x: x ? x : mainDoor?.x, y: y ? y : mainDoor?.y });
    this.inventory();
    this.sound("audio/door_open.wav");
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
