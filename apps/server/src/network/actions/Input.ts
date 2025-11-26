import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { CommandMap, CommandsAliasMap } from "../../command/cmds/index";
import { Variant } from "growtopia.js";
import logger from "@growserver/logger";

export class Input {
  constructor(
    public base: Base,
    public peer: Peer,
  ) {}

  public async execute(
    action: NonEmptyObject<Record<string, string>>,
  ): Promise<void> {
    try {
      const text = action.text.trim();
      if (!text || text.replace(/`.|`/g, "").length < 1) return;

      if (text.startsWith("/")) {
        const args = text.slice("/".length).split(" ");
        const commandName = args.shift()?.toLowerCase() || "";

        // Try to find the command directly by name or by its alias
        let Class = CommandMap[commandName];
        let originalCmd = commandName;

        // Send Peer's input
        this.peer.send(Variant.from("OnConsoleMessage", `\`6${text}`));

        // If no direct command found, check if it's registered as an alias
        if (!Class && CommandsAliasMap[commandName]) {
          originalCmd = CommandsAliasMap[commandName];
          Class = CommandMap[originalCmd];
        }

        // If we still can't find the command, notify the user
        if (!Class) {
          this.peer.send(
            Variant.from(
              "OnConsoleMessage",
              "`4Unknown command. `oEnter /? for a list of valid commands.",
            ),
          );
          return;
        }

        // Create the command instance
        const cmd = new Class(this.base, this.peer, text, args);

        // Double-check that aliases are registered
        // This ensures any missing aliases are registered even if registerAliases failed
        if (cmd.opt && cmd.opt.command) {
          for (const alias of cmd.opt.command) {
            const aliasLower = alias.toLowerCase();
            if (aliasLower !== originalCmd && !CommandsAliasMap[aliasLower]) {
              CommandsAliasMap[aliasLower] = originalCmd;
              logger.debug(
                `Late-registered alias: ${aliasLower} → ${originalCmd}`,
              );
            }
          }
        }

        // Check permissions first - if no permission, don't apply cooldown
        if (!cmd.opt.permission.some((perm) => perm === this.peer.data?.role)) {
          this.peer.send(
            Variant.from(
              "OnConsoleMessage",
              "You dont have permission to use this command.",
            ),
          );
          return;
        }

        // Special check for Sb command - don't apply cooldown if no args
        if (
          (originalCmd === "sb" || originalCmd === "sdb") &&
          args.length === 0
        ) {
          await cmd.execute();
          return;
        }

        // Get cooldown info from command options
        const cooldownSeconds = cmd.opt.cooldown || 1;
        const maxUses = cmd.opt.ratelimit || 1;
        const cooldownKey = `${originalCmd}-netID-${this.peer.data?.netID}`;

        // Check if command is on cooldown
        const cooldownInfo = this.base.cache.cooldown.get(cooldownKey);
        const now = Date.now();

        if (!cooldownInfo) {
          // First use of the command - set initial usage data
          this.base.cache.cooldown.set(cooldownKey, {
            limit: 1, // Starting with 1 because this is the first use
            time:  now,
          });

          // Set up the cooldown timer
          setTimeout(() => {
            this.base.cache.cooldown.delete(cooldownKey);
          }, cooldownSeconds * 1000);
        } else {
          // Command has been used before - check if it's hit the rate limit
          if (cooldownInfo.limit >= maxUses) {
            // Calculate time remaining until cooldown expires
            const expiresAt = cooldownInfo.time + cooldownSeconds * 1000;
            const timeLeftMs = Math.max(0, expiresAt - now);
            const timeLeftSec = (timeLeftMs / 1000).toFixed(1);

            // Send cooldown message to the user
            return this.peer.send(
              Variant.from(
                "OnConsoleMessage",
                `\`6${this.peer.data?.displayName}\`0 you're being ratelimited, please wait \`9${timeLeftSec}s\`0`,
              ),
            );
          }

          // Increment the usage counter
          cooldownInfo.limit += 1;
        }

        // Execute the command
        await cmd.execute();

        return;
      }

      const world = this.peer.currentWorld();
      if (world) {
        world.every((p) => {
          p.send(
            Variant.from(
              "OnTalkBubble",
              this.peer.data?.netID || 0,
              action.text,
              0,
            ),
            Variant.from(
              "OnConsoleMessage",
              `CP:0_PL:0_OID:_CT:[W]_ <\`w${this.peer.data?.displayName}\`\`> ${action.text}`,
            ),
          );
        });
      }
    } catch (e) {
      logger.warn(e);
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Unknown command.`` Enter `$/help`` for a list of valid commands",
        ),
      );
    }
  }
}
