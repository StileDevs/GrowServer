import { Variant } from "growsockets";
import { Peer } from "../structures/Peer";
import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";
import { ActionType } from "../types/action";

export default class extends Action {
  constructor() {
    super();
    this.config = {
      eventName: "input"
    };
  }

  public async handle(
    base: BaseServer,
    peer: Peer,
    action: ActionType<{ action: string; text: string }>
  ): Promise<void> {
    let text = action.text.trim();
    if (!text || text.replace(/`.|`/g, "").length < 1) return;

    if (text.startsWith("/")) {
      const args = text.slice("/".length).split(" ");
      const commandName = args.shift()?.toLowerCase()!;

      if (!base.commands.has(commandName)) {
        return peer.send(
          Variant.from(
            "OnConsoleMessage",
            "`4Unknown command.`` Enter `$/help`` for a list of valid commands"
          )
        );
      }
      peer.send(Variant.from("OnConsoleMessage", `\`6/${commandName} ${args.join(" ")}\`\``));

      // Cooldown & Ratelimit
      if (!base.cooldown.get(`${commandName}-netID-${peer.data.netID}`)) {
        base.cooldown.set(`${commandName}-netID-${peer.data.netID}`, {
          limit: 1,
          time: Date.now()
        });
      } else {
        let expireTime =
          base.cooldown.get(`${commandName}-netID-${peer.data.netID}`)!.time +
          base.commands.get(commandName)!.opt.cooldown * 1000;
        let timeLeft = expireTime - Date.now();
        if (
          base.cooldown.get(`${commandName}-netID-${peer.data.netID}`)!.limit >=
          base.commands.get(commandName)!.opt.ratelimit
        ) {
          return peer.send(
            Variant.from(
              "OnConsoleMessage",
              `\`6${peer.data.tankIDName}\`0 you're being ratelimited, please wait \`9${
                timeLeft / 1000
              }s\`0`
            )
          );
        }
      }

      base.cooldown.get(`${commandName}-netID-${peer.data.netID}`)!.limit += 1;

      setTimeout(() => {
        base.cooldown.delete(`${commandName}-netID-${peer.data.netID}`);
      }, base.commands.get(commandName)!.opt.cooldown * 1000);

      try {
        await base.commands.get(commandName)?.execute(base, peer, text, args);
      } catch (err) {
        console.log(err);
      }
      return;
    }

    peer.everyPeer({ sameWorld: true }, (p) => {
      p.send(
        Variant.from("OnTalkBubble", peer.data.netID, action.text, 0),
        Variant.from(
          "OnConsoleMessage",
          `CP:0_PL:0_OID:_CT:[W]_ <\`w${peer.data.tankIDName}\`\`> ${action.text}`
        )
      );
    });
  }
}
