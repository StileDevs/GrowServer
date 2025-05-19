import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import consola from "consola";
import { CommandMap, CommandsAliasMap } from "../../command/cmds/index";
import { Variant } from "growtopia.js";

export class Input {
  constructor(public base: Base, public peer: Peer) {}

  public async execute(
    action: NonEmptyObject<Record<string, string>>
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
              "`4Unknown command.`` Enter `$/help`` for a list of valid commands"
            )
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
              consola.debug(
                `Late-registered alias: ${aliasLower} → ${originalCmd}`
              );
            }
          }
        }

        const cmdCd = this.base.cache.cooldown.get(
          `${originalCmd}-netID-${this.peer.data?.netID}`
        );
        if (!cmdCd)
          this.base.cache.cooldown.set(
            `${originalCmd}-netID-${this.peer.data?.netID}`,
            {
              limit: 1,
              time:  Date.now(),
            }
          );
        else {
          const expireTime = cmdCd.time + cmd.opt.cooldown * 1000;
          const timeLeft = expireTime - Date.now();
          if (cmdCd.limit >= cmd.opt.ratelimit)
            return this.peer.send(
              Variant.from(
                "OnConsoleMessage",
                `\`6${
                  this.peer.data?.tankIDName
                }\`0 you're being ratelimited, please wait \`9${
                  timeLeft / 1000
                }s\`0`
              )
            );
          cmdCd.limit += 1;
        }

        setTimeout(() => {
          this.base.cache.cooldown.delete(
            `${originalCmd}-netID-${this.peer.data?.netID}`
          );
        }, cmd.opt.cooldown || 0 * 1000);

        if (cmd.opt.permission.some((perm) => perm === this.peer.data?.role))
          await cmd.execute();
        else
          this.peer.send(
            Variant.from(
              "OnConsoleMessage",
              "You dont have permission to use this command."
            )
          );

        return;
      }

      this.peer.every((p) => {
        if (
          p.data?.world === this.peer.data?.world &&
          this.peer.data?.world !== "EXIT"
        ) {
          p.send(
            Variant.from(
              "OnTalkBubble",
              this.peer.data?.netID || 0,
              action.text,
              0
            ),
            Variant.from(
              "OnConsoleMessage",
              `CP:0_PL:0_OID:_CT:[W]_ <\`w${this.peer.data?.tankIDName}\`\`> ${action.text}`
            )
          );
        }
      });
    } catch (e) {
      consola.warn(e);
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Unknown command.`` Enter `$/help`` for a list of valid commands"
        )
      );
    }
  }
}
