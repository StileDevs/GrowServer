import { registerDialog } from "../network/dialog-handler";
import { deliverDailyQuest, questDailyDialog } from "./daily-quest";
import { ROLES, type RoleId } from "./constants";
import { claimRoleReward, parseClaimButton, roleRewardDialog, sendGoalsDialog } from "./role-quests";

/**
 * Dialog returns of the quest systems: the Crazy Jim daily delivery, the
 * goals overview and the per-role milestone reward dialogs.
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
