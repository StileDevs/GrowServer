import { logger } from "../../utils/logger";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { executeCommand } from "../commands";

/**
 * Handles the `input` action: slash commands or world chat.
 */
export async function handleChatInput(player: Player, rawText: string): Promise<void> {
  const text = rawText.trim();
  if (!text || text.replace(/`.|`/g, "").length < 1) return;

  if (text.startsWith("/")) {
    player.variants.sendOnConsoleMessage(`\`6${text}`);
    try {
      await executeCommand(player, text.slice(1));
    } catch (err) {
      logger.warn({ err, text, player: player.tankIDName }, "command failed");
      player.variants.sendOnConsoleMessage("`4Unknown command.`` Enter `$/help`` for a list of valid commands");
    }
    return;
  }

  const world = player.world;
  if (!world) return;

  // strip color codes from player chat so nobody can impersonate the server
  const message = text.replace(/`./g, "");
  // modern clients render the bubble from the `player_chat=` payload
  world.broadcastVariant(Variant.from("OnTalkBubble", player.netID, `CP:0_PL:0_OID:_player_chat=${message}`, 0));
  world.broadcastVariant(Variant.from({ netID: player.netID }, "OnConsoleMessage", `CP:0_PL:0_OID:_CT:[W]_ \`6<${player.formattedName}>\`\` \`$\`$${message}\`\`\`\``));
}
