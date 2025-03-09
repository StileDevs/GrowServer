import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";

export class Wrench {
  constructor(
    public base: Base,
    public peer: Peer
  ) {}

  private InfoDialog(): DialogBuilder {
    // for now will put basic info
    return new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(
        `${this.peer.name}\`w's Information (uid: ${this.peer.data.id_user})`,
        32,
        "big"
      )
      .addTextBox(`Player Infomation`)
      .addSmallText(`Level: ${this.peer.data.level || 1} (${this.peer.data.exp}/${this.peer.calculateRequiredLevelXp(this.peer.data.level)})`)
      .addSmallText(`Gems: ${this.peer.data.gems || 0}`)
      .addSmallText(`NetID: ${this.peer.data.netID}`);
  }

  public async execute(
    _action: NonEmptyObject<Record<string, string>>
  ): Promise<void> {
    const dialog = this.InfoDialog()
      .endDialog("wrench_end", "Cancel", "OK")
      .addQuickExit()
      .str();

    this.peer.send(Variant.from("OnDialogRequest", dialog));
  }
}
