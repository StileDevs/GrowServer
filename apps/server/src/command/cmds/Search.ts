import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";
import { DialogBuilder } from "@growserver/utils";

export default class Search extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command:     ["search"],
      description: "Search items with searchable item list",
      cooldown:    5,
      ratelimit:   5,
      category:    "`oBasic",
      usage:       "/search",
      example:     ["/search"],
      permission:  [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER],
    };
  }

  public async execute(): Promise<void> {
    const dialog = new DialogBuilder()
      .defaultColor()
      .addInputBox("n", "Search: ", "", 26)
      .raw(
        "add_searchable_item_list||sourceType:allItems;listType:iconWithCustomLabel;resultLimit:50|n|\n",
      )
      .addQuickExit()
      .endDialog("search_item", "", "")
      .str();

    this.peer.send(Variant.from("OnDialogRequest", dialog));
  }
}
