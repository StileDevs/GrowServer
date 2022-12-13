import { TankPacket, TextPacket, Variant } from "growsockets";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { DialogReturnType } from "../types/dialog";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { DataTypes } from "../utils/enums/DataTypes";
import { TankTypes } from "../utils/enums/TankTypes";

export default class extends Dialog {
  constructor() {
    super();
    this.config = {
      dialogName: "drop_end"
    };
  }

  public handle(
    base: BaseServer,
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      drop_count: string;
      itemID: string;
    }>
  ): void {
    // TODo: drop visual & save it to db
    const drop = new TankPacket({
      type: TankTypes.PEER_DROP,
      netID: -1,
      targetNetID: peer.data.netID,
      state: 0,
      info: parseInt(action.itemID),
      xPos: peer.data.x,
      yPos: peer.data.y
    });

    peer.send(drop);
    // peer.send(TextPacket.from(DataTypes.ACTION, "action|drop", `itemID|${action.itemID}`));
  }
}
