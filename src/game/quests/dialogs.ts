import { registerDialog } from "../network/dialog-handler";
import { deliverDailyQuest, questDailyDialog } from "./daily-quest";
import { ROLES, type RoleId } from "./constants";
import { claimRoleReward, parseClaimButton, roleRewardDialog, sendGoalsDialog } from "./role-quests";
import { handleSurgeryAction, startSurgery } from "../surgery/surgery-manager";

/**
 * Dialog returns of the quest systems: the Crazy Jim daily delivery, the
 * goals overview, the per-role milestone reward dialogs and the surgery
 * confirm/tool dialogs.
 */

registerDialog("quest_daily", async (player, action) => {
  const button = action.get("buttonClicked");
  if (button === "daily_deliver") {
    deliverDailyQuest(player);
    player.variants.sendOnDialogRequest(questDailyDialog(player));
  }
});

registerDialog("quest_goals", async (player, action) => {
  const button = action.get("buttonClicked");
  if (button === "daily_deliver") {
    deliverDailyQuest(player);
    sendGoalsDialog(player);
    return;
  }
  if (button?.endsWith("_reward")) {
    let roleStr = button.slice(0, -"_reward".length);
    if (roleStr === "surgery") roleStr = "surgeon";
    const role = roleStr as RoleId;
    if (ROLES[role]) player.variants.sendOnDialogRequest(roleRewardDialog(player, role));
  }
});

for (const id of Object.keys(ROLES) as RoleId[]) {
  registerDialog(`quest_reward_${id}`, async (player, action) => {
    const claim = parseClaimButton(action.get("buttonClicked") ?? "");
    if (!claim) return;
    claimRoleReward(player, claim.role, claim.index);
    player.variants.sendOnDialogRequest(roleRewardDialog(player, claim.role));
  });
}

/**
 * The robot/bed confirm dialog returns `surge`. `surge_start` (or any accept
 * label an older client sends) starts the surgery; `surge_cancel` aborts.
 * The tool tray dialog is named `surgery` and is handled separately.
 */
registerDialog("surge", async (player, action) => {
  const world = player.world;
  if (!world) return;
  const button = action.get("buttonClicked") ?? "";
  if (button === "surge_cancel" || button === "Cancel") {
    player.surgery = null;
    return;
  }
  startSurgery(player, world);
});

// The tray dialog itself uses end_dialog|surgery|||.
registerDialog("surgery", async (player, action) => {
  const world = player.world;
  if (!world) return;
  handleSurgeryAction(player, world, action.get("buttonClicked") ?? "");
});
