import { PLAYER_ROLE, playerRoleRank } from "../../constants";
import { Collection } from "../../utils/collection";
import type { Player } from "../player";

/** Definition of a chat command (`/name args`). */
export interface ChatCommand {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  /** Lowest role allowed to run the command. */
  role?: PLAYER_ROLE;
  /** Seconds between two uses by the same player. */
  cooldown?: number;
  execute(player: Player, args: string[], raw: string): Promise<void> | void;
}

/** Registered commands by name. */
export const commands: Collection<string, ChatCommand> = new Collection();
/** Alias to command name. */
export const commandAliases: Collection<string, string> = new Collection();

/** Next allowed use per `command:playerId`. */
const cooldowns: Collection<string, number> = new Collection();

export function registerCommand(command: ChatCommand): void {
  commands.set(command.name.toLowerCase(), command);
  for (const alias of command.aliases ?? []) commandAliases.set(alias.toLowerCase(), command.name.toLowerCase());
}

export function findCommand(name: string): ChatCommand | undefined {
  const lower = name.toLowerCase();
  return commands.get(lower) ?? commands.get(commandAliases.get(lower) ?? "");
}

/** Role precedence: developers can do everything moderators can, and so on. */
export function roleRank(role: PLAYER_ROLE): number {
  return playerRoleRank(role);
}

export function canUseCommand(player: Player, command: ChatCommand): boolean {
  return roleRank(player.role) >= roleRank(command.role ?? PLAYER_ROLE.BASIC);
}

/**
 * Parses and runs a slash command typed in chat (without the leading slash).
 */
export async function executeCommand(player: Player, input: string): Promise<void> {
  const args = input.trim().split(/\s+/);
  const name = (args.shift() ?? "").toLowerCase();
  const command = findCommand(name);

  if (!command) {
    player.variants.sendOnConsoleMessage("`4Unknown command. `oEnter /? for a list of valid commands.");
    return;
  }

  if (!canUseCommand(player, command)) {
    player.variants.sendOnConsoleMessage("You dont have permission to use this command.");
    return;
  }

  const cooldownKey = `${command.name}:${player.id}`;
  const now = Date.now();
  const readyAt = cooldowns.get(cooldownKey) ?? 0;
  if (readyAt > now) {
    player.variants.sendOnConsoleMessage(`\`6${player.displayName}\`0 you're being ratelimited, please wait \`9${((readyAt - now) / 1000).toFixed(1)}s\`0`);
    return;
  }
  cooldowns.set(cooldownKey, now + (command.cooldown ?? 1) * 1000);

  await command.execute(player, args, input);
}

