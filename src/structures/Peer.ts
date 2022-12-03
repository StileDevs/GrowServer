import { Peer as OldPeer, Server, TankPacket } from "growsockets";
import { PeerDataType } from "../types/peer";
import { TankTypes } from "../utils/enums/TankTypes";
import { BaseServer } from "./BaseServer";
import { World } from "./World";

export class Peer extends OldPeer<PeerDataType> {
  public base;

  constructor(server: Server<unknown, unknown, unknown>, netID: number, base: BaseServer) {
    super(server, netID);

    this.base = base;
  }

  /** Extended version of setDataToCache */
  public saveToCache() {
    return this.base.cache.users.set(this.data.netID, this);
  }

  public getSelfCache() {
    return this.base.cache.users.get(this.data.netID);
  }

  public async enterWorld(worldName: string) {
    if (this.base.cache.worlds.has(worldName)) {
      const world = this.base.cache.worlds.get(worldName)!;
      const mainDoor = world.data.blocks?.find((block) => block.fg === 6);

      await world.enter(this, { x: mainDoor?.x, y: mainDoor?.y });
      this.inventory();
    } else {
      const world = new World(this.base, worldName);
      const mainDoor = world.data.blocks?.find((block) => block.fg === 6);

      await world.enter(this, { x: mainDoor?.x, y: mainDoor?.y });
      this.inventory();
    }
  }

  public inventory() {
    let inventory = {
      max: 32,
      items: [
        {
          id: 18, // Fist
          amount: 1
        },
        {
          id: 32, // Wrench
          amount: 1
        },
        {
          id: 2, // Dirt
          amount: 200
        }
      ]
    };

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
