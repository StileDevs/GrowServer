import { DialogBuilder } from "../../utils/dialog-builder";
import { logger } from "../../utils/logger";
import { getItem } from "../item/item-utils";
import { Variant } from "../packets/variants";
import { MAX_LEVEL, Player } from "../player";
import { ITEM_ID } from "../world/constants";
import { worldManager } from "../world/world-manager";
import { registerDialog } from "./dialog-handler";

/** Buttons of the wrench menu that open one of the client's RML pages. */
const RML_PAGES: Record<string, string> = {
  seed_diary_customization: "show_seed_diary_ui",
  open_worldlock_storage: "show_world_lock_storage",
};

function wrenchButton(dialog: DialogBuilder, name: string, image: string): DialogBuilder {
  return dialog.raw(`add_custom_button|${name}|image:interface/large/${image}.rttex;image_size:400,260;width:0.19;|\n`);
}

/**
 * The wrench menu a player gets for their own avatar: level card, the
 * client's feature buttons and the account summary.
 */
export function selfProfileDialog(player: Player): string {
  const requiredXp = player.level >= MAX_LEVEL ? 0 : Player.requiredXpForLevel(player.level);
  const world = player.world;
  const tileX = Math.floor(player.state.x / 32);
  const tileY = Math.floor(player.state.y / 32);

  const dialog = new DialogBuilder()
    .embed("netID", player.netID)
    .raw("add_popup_name|WrenchMenu|\n")
    .defaultColor()
    .addPlayerInfo(player.formattedName, player.level, player.xp, requiredXp)
    .addSpacer("small")
    .addSpacer("small")
    .raw("set_custom_spacing|x:5;y:10|\n");

  wrenchButton(dialog, "open_personlize_profile", "gui_wrench_personalize_profile");
  wrenchButton(dialog, "set_online_status", "gui_wrench_online_status_1green");
  wrenchButton(dialog, "wardrobe_customization", "gui_wrench_wardrobe");
  wrenchButton(dialog, "notebook_edit", "gui_wrench_notebook");
  wrenchButton(dialog, "my_worlds", "gui_wrench_my_worlds");
  wrenchButton(dialog, "alist", "gui_wrench_achievements");
  wrenchButton(dialog, "emojis", "gui_wrench_growmojis");
  wrenchButton(dialog, "title_edit", "gui_wrench_title");
  wrenchButton(dialog, "trade_scan", "gui_wrench_trades");
  wrenchButton(dialog, "wrench_customization", "gui_wrench_customization");

  dialog
    .addCustomBreak()
    .addSpacer("small")
    .raw("set_custom_spacing|x:0;y:0|\n")
    .addSpacer("small")
    .addTextBox("`wActive effects:``")
    .addSpacer("small")
    .addTextBox(`\`oYou have \`w${player.inventory.max}\`\` backpack slots.\`\``)
    .addTextBox(
      world
        ? `\`oCurrent world: \`w${world.name}\`\` (\`w${tileX}\`\`, \`w${tileY}\`\`) (\`w${world.players.length}\`\` ${world.players.length === 1 ? "person" : "people"})\`\``
        : "`oYou are not in a world.``",
    )
    .addSpacer("small")
    .addTextBox(`\`oGems: \`w${player.gems}\`\`  Role: \`w${player.isDeveloper ? "Developer" : player.isModerator ? "Moderator" : "Player"}\`\``)
    .addSpacer("small")
    .addQuickExit()
    .endDialog("popup", "", "Continue");

  return dialog.str();
}

/**
 * The wrench menu for another player's avatar.
 */
export function otherProfileDialog(target: Player): string {
  return new DialogBuilder()
    .embed("netID", target.netID)
    .raw("add_popup_name|WrenchMenu|\n")
    .defaultColor()
    .addLabelWithIcon(`${target.formattedName} (\`2${target.level}\`\`)\`\``, ITEM_ID.FIST, "big")
    .addSpacer("small")
    .addButton("trade", "`wTrade``")
    .addButton("sendpm", "`wSend Message``")
    .addButton("friend_add", "`wAdd as friend``")
    .addButton("show_clothes", "`wView worn clothes``")
    .addButton("ignore_player", "`wIgnore Player``")
    .addButton("report_player", "`wReport Player``")
    .addSpacer("small")
    .addQuickExit()
    .endDialog("popup", "", "Continue")
    .str();
}

/** Worlds owned by a player among the loaded ones. */
function ownedWorldNames(player: Player): string[] {
  return worldManager.worlds.filter((world) => world.getOwnerPlayerId() === player.playerId).map((world) => world.name);
}

registerDialog("popup", (player, action) => {
  const button = action.get("buttonClicked");
  const targetNetId = action.getInt("netID", 0, -1);
  const target = player.world?.players.find((other) => other.netID === targetNetId);

  switch (button) {
    case "my_worlds": {
      const dialog = new DialogBuilder()
        .defaultColor()
        .addLabel("Locked Worlds", "big")
        .addSpacer("small")
        .addTextBox("Place a World Lock in a world to lock it. Break your World Lock to unlock a world.")
        .addSpacer("small");
      for (const name of ownedWorldNames(player)) dialog.addWorldLinkButton(name, name, name);
      dialog.addSpacer("small").endDialog("worlds_list", "", "Back").addQuickExit();
      player.variants.sendOnDialogRequest(dialog.str());
      return;
    }
    case "show_clothes": {
      if (!target) return;
      const dialog = new DialogBuilder().defaultColor().addLabelWithIcon(`${target.formattedName}'s clothes`, ITEM_ID.WRENCH, "big").addSpacer("small");
      const worn = Object.values(target.inventory.clothes).filter((id) => id > 0);
      if (worn.length === 0) dialog.addTextBox("`oNothing worn.``");
      for (const id of worn) dialog.addLabelWithIcon(`\`w${getItem(id)?.name ?? id}\`\``, id, "small");
      dialog.addSpacer("small").addQuickExit().endDialog("clothes_end", "", "Close");
      player.variants.sendOnDialogRequest(dialog.str());
      return;
    }
    case "trade":
    case "sendpm":
    case "friend_add":
    case "ignore_player":
    case "report_player":
      player.variants.sendOnConsoleMessage("`4That feature isn't available on this server yet.``");
      return;
    default: {
      const page = RML_PAGES[button];
      if (page) {
        player.variants.sendVariant(Variant.from("OnDialogRequestRML", page));
        return;
      }
      if (button) logger.debug({ button, player: player.tankIDName }, "unhandled wrench menu button");
    }
  }
});

registerDialog("worlds_list", () => {});
registerDialog("clothes_end", () => {});
registerDialog("wrench_end", () => {});
