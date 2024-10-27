import { Variant } from "growtopia.js";
import { Base } from "../../core/Base.js";
import { Peer } from "../../core/Peer.js";
import { DialogBuilder } from "../../utils/builders/DialogBuilder.js";
import { type NonEmptyObject } from "type-fest";

export class EnterGame {
  constructor(public base: Base) {}

  public async execute(peer: Peer, action: NonEmptyObject<{ action: string }>): Promise<void> {
    const tes = new DialogBuilder().defaultColor().addLabelWithIcon("`wThe GrowServer Gazette``", "5016", "big").addSpacer("small").raw("add_image_button||interface/large/banner-transparent.rttex|bannerlayout|||\n").addTextBox("Welcome to GrowServer").addQuickExit().endDialog("gazzette_end", "Cancel", "Ok").str();
    peer.send(
      Variant.from(
        "OnRequestWorldSelectMenu",
        `
add_heading|Top Worlds|
add_floater|START|0|0.5|3529161471
add_floater|START1|0|0.5|3529161471
add_floater|START2|0|0.5|3529161471
${Array.from(this.base.cache.worlds.values())
  .sort((a, b) => (b.playerCount || 0) - (a.playerCount || 0))
  .slice(0, 6)
  .map((v) => {
    if (v.playerCount) return `add_floater|${v.name}${v.playerCount ? ` (${v.playerCount})` : ""}|0|0.5|3529161471\n`;
    else return "";
  })
  .join("\n")}
add_heading|Recently Visited Worlds<CR>|
${peer.data.lastVisitedWorlds
  ?.reverse()
  .map((v) => {
    const count = this.base.cache.worlds.get(v)?.playerCount || 0;
    return `add_floater|${v}${count ? ` (${count})` : ""}|0|0.5|3417414143\n`;
  })
  .join("\n")}
`
      ),
      Variant.from("OnConsoleMessage", `Welcome ${peer.name} Where would you like to go?`),
      Variant.from({ delay: 100 }, "OnDialogRequest", tes)
    );
  }
}
