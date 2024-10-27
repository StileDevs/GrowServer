import { Block, PeerData } from "../types";
import { Peer as OldPeer, TankPacket, TextPacket, Variant } from "growtopia.js";
import { Base } from "./Base.js";
import { World } from "./World.js";
import { ActionTypes, PacketTypes, ROLE, TankTypes } from "../Constants.js";
import { manageArray } from "../utils/Utils.js";

export class Peer extends OldPeer<PeerData> {
  public base;
  constructor(base: Base, netID: number) {
    super(base.server, netID);
    this.base = base;

    const data = this.base.cache.peers.get(netID);
    if (data)
      this.data = {
        x: data.x,
        y: data.y,
        world: data.world,
        inventory: data.inventory,
        rotatedLeft: data.rotatedLeft,
        requestedName: data.requestedName,
        tankIDName: data.tankIDName,
        netID,
        country: data.country,
        id_user: data.id_user,
        role: data.role,
        gems: data.gems,
        clothing: data.clothing,
        exp: data.exp,
        level: data.level,
        lastCheckpoint: data.lastCheckpoint,
        lastVisitedWorlds: data.lastVisitedWorlds,
        state: data.state,
        // @ts-expect-error
        enet: this.client._client.getPeer(netID)
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
      Variant.from({ netID: this.data.netID, delay: 2000 }, "OnSetPos", [(mainDoor?.x || 0 % world.data.width) * 32, (mainDoor?.y || 0 % world.data.width) * 32]),
      Variant.from({ netID: this.data.netID, delay: 2000 }, "OnSetFreezeState", 0)
    );

    this.sound("audio/teleport.wav", 2000);
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
    this.send(TextPacket.from(PacketTypes.ACTION, "action|play_sfx", `file|${file}`, `delayMS|${delay}`));
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

    this.data.lastVisitedWorlds = manageArray(this.data.lastVisitedWorlds!, 6, worldName);
  }
}
