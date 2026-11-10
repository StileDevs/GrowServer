import { logger } from "../../utils/logger";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { executeCommand } from "../commands";
import { PLAYER_ROLE } from "../../constants";

/**
 * Handles the `input` action: slash commands or world chat.
 */
export async function handleChatInput(player: Player, rawText: string): Promise<void> {
  const text = rawText.trim();
  if (!text || text.replace(/`.|`/g, "").length < 1) return;

  // support /say as a chat command
  if (text.toLowerCase().startsWith("/say ") || text.toLowerCase() === "/say") {
    const sayMessage = text.slice(4).trim();
    if (!sayMessage) {
      player.variants.sendOnConsoleMessage("`4Usage: /say <message>``");
      return;
    }
    await broadcastWorldChat(player, sayMessage);
    return;
  }

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

  await broadcastWorldChat(player, text);
}

/**
 * Broadcasts world chat conforming to GTOS packet format (tile.h:9131-9132 & player.h:2356-2364).
 * - OnTalkBubble carries only the spoken message above the player's head.
 * - OnConsoleMessage carries the [W] channel tag, <name> header, and $player_chat= payload.
 */
export async function broadcastWorldChat(player: Player, rawMessage: string): Promise<void> {
  const world = player.world;
  if (!world) return;

  // strip color codes from player chat so nobody can impersonate the server
  const message = rawMessage.replace(/`./g, "").trim();
  if (!message) return;
  const name = player.formattedName;

  let ccode = "w";
  let chatcode = "$";

  switch (player.role) {
    case PLAYER_ROLE.OWNER:
    case PLAYER_ROLE.DEVELOPER:
      ccode = "8";
      chatcode = "8";
      break;
    case PLAYER_ROLE.MODERATOR:
      ccode = "5";
      chatcode = "5";
      break;
    case PLAYER_ROLE.SUPPORTER:
      ccode = "e";
      chatcode = "e";
      break;
    default:
      ccode = "w";
      chatcode = "$";
      break;
  }

  // GTOS reference:
  // Player::OnConsoleMessage(currentPeer, "CP:_PL:0_OID:_CT:[W]_ `6<`w" + displayName + "`6> `$player_chat=`" + chatcode + message);
  // Player::OnTalkBubble(currentPeer, netID, "`" + ccode + message, 0, false);
  world.broadcastVariant(Variant.from("OnTalkBubble", player.netID, "CP:_PL:0_OID:_`" + ccode + message, 0, 0));
  world.broadcastVariant(
    Variant.from("OnConsoleMessage", "CP:_PL:0_OID:_CT:[W]_ `6<" + name + "`6> `$player_chat=`" + chatcode + message),
  );
}
