import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import type { CommandOptions } from "../types";
import { Role } from "../utils/Constants.js";
import { find } from "../utils/Utils.js";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "givegems",
      description: "Give gems to someone or self",
      cooldown: 5,
      ratelimit: 5,
      category: "Developer",
      usage: "/givegems <gems> <to_who?>",
      example: ["/givegems 100", "/givegems 100 JadlionHD"],
      permission: [Role.DEVELOPER]
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0]) return peer.send(Variant.from("OnConsoleMessage", "Gems amount are required."));
    if (!/\d/.test(args[0])) return peer.send(Variant.from("OnConsoleMessage", "Gems amount are must be a number."));
    if (args.length > 1) {
      const targetPeer = find(this.base, this.base.cache.users, (user) => (user.data?.tankIDName || "").toLowerCase().includes(args[1].toLowerCase()));
      if (!targetPeer) return peer.send(Variant.from("OnConsoleMessage", "Make sure that player is online."));

      targetPeer.send(Variant.from("OnSetBux", parseInt(args[0])));
      targetPeer.data.gems = parseInt(args[0]);
      targetPeer.saveToCache();
      targetPeer.saveToDatabase();

      peer.send(Variant.from("OnConsoleMessage", `Sucessfully sending \`w${args[0]}\`\` gems to ${targetPeer.name}`));
    } else {
      peer.send(Variant.from("OnSetBux", parseInt(args[0])));
      peer.data.gems = parseInt(args[0]);
      peer.saveToCache();
      // peer.saveToDatabase();
      peer.send(Variant.from("OnConsoleMessage", `Sucessfully received \`w${args[0]}\`\` gems.`));
    }
  }
}
