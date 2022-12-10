import { TextPacket, Variant } from "growsockets";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { DialogReturnType } from "../types/dialog";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { DataTypes } from "../utils/enums/DataTypes";

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
    // TODo: drop visual
    peer.send(TextPacket.from(DataTypes.ACTION, "action|drop", `itemID|${action.itemID}`));
  }
}
