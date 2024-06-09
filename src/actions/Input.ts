import { Variant } from "growtopia.js";
import { Peer } from "../structures/Peer.js";
import { Action } from "../abstracts/Action.js";
import { BaseServer } from "../structures/BaseServer.js";
import type { ActionType } from "../types";

export default class extends Action {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      eventName: "input"
    };
  }

  public getCommand(commandName: string) {
    return (
      this.base.commands.get(commandName) || {
        execute: async () => {},
        opt: {
          name: "",
          description: "",
          cooldown: 5,
          ratelimit: 5,
          category: "Basic",
          usage: "",
          example: [],
          permission: []
        }
      }
    );
  }

  public async handle(peer: Peer, action: ActionType<{ action: string; text: string }>): Promise<void> {
    const text = action.text.trim();
    if (!text || text.replace(/`.|`/g, "").length < 1) return;

    if (text.startsWith("/")) {
      const args = text.slice("/".length).split(" ");
      const commandName = args.shift()?.toLowerCase() || "";

      if (!this.base.commands.has(commandName)) {
        return peer.send(Variant.from("OnConsoleMessage", "`4Unknown command.`` Enter `$/help`` for a list of valid commands"));
      }
      peer.send(Variant.from("OnConsoleMessage", `\`6/${commandName} ${args.join(" ")}\`\``));

      // Cooldown & Ratelimit
      const cmd = this.getCommand(commandName);

      const cmdCd = this.base.cooldown.get(`${commandName}-netID-${peer.data?.netID}`);
      if (!cmdCd) {
        const cmdSet = this.base.cooldown.set(`${commandName}-netID-${peer.data?.netID}`, {
          limit: 1,
          time: Date.now()
        });
      } else {
        const expireTime = cmdCd.time + cmd.opt.cooldown * 1000;
        const timeLeft = expireTime - Date.now();
        if (cmdCd.limit >= cmd.opt.ratelimit) {
          return peer.send(Variant.from("OnConsoleMessage", `\`6${peer.data?.tankIDName}\`0 you're being ratelimited, please wait \`9${timeLeft / 1000}s\`0`));
        }
        cmdCd.limit += 1;
      }

      setTimeout(() => {
        this.base.cooldown.delete(`${commandName}-netID-${peer.data?.netID}`);
      }, cmd.opt.cooldown || 0 * 1000);

      try {
        if (cmd.opt.permission.some((perm) => perm === peer.data?.role)) {
          await cmd.execute(peer, text, args);
        } else {
          peer.send(Variant.from("OnConsoleMessage", "You dont have permission to use this command."));
        }
      } catch (err) {
        this.base.log.error(err);
      }
      return;
    }

    peer.everyPeer((p) => {
      if (p.data?.world === peer.data?.world && peer.data?.world !== "EXIT") {
        p.send(Variant.from("OnTalkBubble", peer.data?.netID || 0, action.text, 0), Variant.from("OnConsoleMessage", `CP:0_PL:0_OID:_CT:[W]_ <\`w${peer.data?.tankIDName}\`\`> ${action.text}`));
      }
    });
  }
}
