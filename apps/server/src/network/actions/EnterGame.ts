import { Variant } from "growtopia.js";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "@growserver/utils";
import { type NonEmptyObject } from "type-fest";
import { World } from "../../core/World";
import { tileFrom, tileUpdateMultiple } from "../../world/tiles";
import { TileFlags } from "@growserver/const";
import { HeartMonitorTile } from "../../world/tiles/HeartMonitorTile";

export class EnterGame {
  constructor(
    public base: Base,
    public peer: Peer,
  ) {}

  public async execute(
    _action: NonEmptyObject<Record<string, string>>,
  ): Promise<void> {
    const tes = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("`wThe GrowServer Gazette``", "5016", "big")
      .addSpacer("small")
      .raw(
        "add_image_button||interface/banner-transparent.rttex|bannerlayout|||\n",
      )
      .addTextBox("Welcome to GrowServer")
      .addQuickExit()
      .endDialog("gazzette_end", "Cancel", "Ok")
      .str();
    this.peer.send(
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
    if (v.playerCount)
      return `add_floater|${v.name}|${v.playerCount ?? 0}|0.5|3529161471\n`;
    else return "";
  })
  .join("\n")}
add_heading|Recently Visited Worlds<CR>|
${this.peer.data.lastVisitedWorlds
  ?.reverse()
  .map((v) => {
    const count = this.base.cache.worlds.get(v)?.playerCount || 0;
    return `add_floater|${v}|${count ?? 0}|0.5|3417414143\n`;
  })
  .join("\n")}
`,
      ),
      Variant.from(
        "OnConsoleMessage",
        `Welcome ${this.peer.data.displayName}\`\` There are \`w${this.base.getPlayersOnline()}\`\` players online.`,
      ),
      Variant.from({ delay: 100 }, "OnDialogRequest", tes),
    );

    this.peer.data.heartMonitors.forEach((indexes, worldName) => {
      const tiles = new Array<HeartMonitorTile>();
      const worldData = this.base.cache.worlds.get(worldName);

      if (!worldData || worldData.playerCount == 0) return;

      const world = new World(this.base, worldName);

      for (const index of indexes) {
        const heartMonitorTile = tileFrom(
          this.base,
          world,
          worldData.blocks[index],
        );

        tiles.push(heartMonitorTile as HeartMonitorTile);
      }

      tileUpdateMultiple(world, tiles);
    });
  }
}
