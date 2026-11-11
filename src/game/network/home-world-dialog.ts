import { DialogBuilder } from "../../utils/dialog-builder";
import type { Player } from "../player";
import { registerDialog } from "./dialog-handler";

/** Home-world settings popup, reached from the wrench menu or /homeworld. */
export function homeWorldDialog(player: Player): string {
  const world = player.world;
  const ownedHere = !!world && world.getOwnerPlayerId() === player.playerId;
  const dialog = new DialogBuilder()
    .defaultColor()
    .addLabelWithIcon("`wYour Home World``", 242, "big")
    .addSpacer("small")
    .addTextBox(player.homeWorld ? `Your home world is \`2${player.homeWorld}\`\`.` : "`oYou haven't selected a home world yet.``")
    .addSmallText("Use /home to warp there or set it from your own World Lock.")
    .addSpacer("small");

  if (player.homeWorld) {
    dialog.addWorldLinkButton("`2Go to Home World``", player.homeWorld);
    dialog.addButton("home_clear", "`4Remove Home World``");
  }
  if (ownedHere && player.homeWorld !== world.name) {
    dialog.addButton("home_set_here", `\`2Set ${world.name} as Home World\`\``);
  } else if (!ownedHere) {
    dialog.addSmallText("To set a home world, visit a World Locked world that you own.");
  }
  return dialog.addQuickExit().endDialog("home_world_settings", "", "Close").str();
}

registerDialog("home_world_settings", (player, action) => {
  const button = action.get("buttonClicked");
  if (button === "home_set_here") {
    const world = player.world;
    if (!world || world.getOwnerPlayerId() !== player.playerId) return;
    player.setHomeWorld(world.name);
    player.sendTextBubble(`\`2${world.name}\`\` is now your home world!`, true);
  } else if (button === "home_clear") {
    if (!player.homeWorld) return;
    player.setHomeWorld(null);
    player.sendTextBubble("Your home world has been removed.", true);
  } else return;
  player.variants.sendOnDialogRequest(homeWorldDialog(player));
});
