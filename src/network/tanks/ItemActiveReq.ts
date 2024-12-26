import { ItemDefinition, Tank, TankPacket, Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { World } from "../../core/World";
import { Block } from "../../types";
import { ActionTypes, ClothTypes } from "../../Constants";

export class ItemActiveReq {
  private pos: number;

  constructor(public base: Base, public peer: Peer, public tank: TankPacket, public world: World) {
    this.pos = (this.tank.data?.xPunch as number) + (this.tank.data?.yPunch as number) * this.world.data.width;
  }

  public async execute() {
    this.tank.data!.state = this.peer.data.rotatedLeft ? 16 : 0;
    const isItemExist = (id: number) => this.peer.data.inventory.items.find((i) => i.id === id);
    const item = this.base.items.metadata.items.find((v) => v.id === this.tank.data?.info);

    const itemExist = isItemExist(this.tank.data?.info as number);

    if (!itemExist || itemExist.amount <= 0) return;

    if (item?.type === ActionTypes.LOCK) {
      switch (item.id) {
        case 7188: {
          if ((this.peer.searchItem(1796)?.amount as number) + 100 > 200) {
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Whoops, you're holding too many Diamond Locks!", 0, 1));
          } else {
            this.peer.addItemInven(1796, 100);
            this.peer.removeItemInven(7188, 1);
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "You shattered a Blue Gem Lock into 100 Diamond Locks!", 0, 1));
          }
          break;
        }
        case 1796: {
          if ((this.peer.searchItem(242)?.amount as number) + 100 > 200) {
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Whoops, you're holding too many World Locks!", 0, 1));
          } else {
            this.peer.addItemInven(242, 100);
            this.peer.removeItemInven(1796, 1);
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "You shattered a Diamond Lock into 100 World Locks!", 0, 1));
          }
          break;
        }
        case 242: {
          if ((this.peer.searchItem(242)?.amount as number) < 100) break;
          if ((this.peer.searchItem(1796)?.amount as number) + 1 > 200) {
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "Whoops, you're holding too many Diamond Locks!", 0, 1));
          } else {
            this.peer.addItemInven(1796, 1);
            this.peer.removeItemInven(242, 100);
            this.peer.send(Variant.from("OnTalkBubble", this.peer.data.netID, "You compressed 100 World Locks into a Diamond Lock!", 0, 1));
          }
          break;
        }
      }
      this.peer.saveToCache();
      this.peer.saveToDatabase();
      this.peer.inventory();
      return;
    }

    this.peer.equipClothes(item?.id!);
    // this.peer.checkModsEffect(true, this.tank);

    this.peer.saveToCache();
    this.peer.saveToDatabase();
    this.peer.sendClothes();
  }
}
