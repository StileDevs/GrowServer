import { TextPacket, Variant } from "growtopia.js";
import { Command } from "../abstracts/Command.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import type { CommandOptions } from "../types";
import { Role } from "../utils/Constants.js";
import { DataTypes } from "../utils/enums/DataTypes.js";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "sb",
      description: "Broadcast a message to everyone",
      cooldown: 5,
      ratelimit: 1,
      category: "Basic",
      usage: "/sb <message>",
      example: ["/sb hello"],
      permission: [Role.BASIC, Role.SUPPORTER, Role.DEVELOPER]
    };
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args.length) return peer.send(Variant.from("Message are required."));

    const world = peer.hasWorld(peer.data.world);

    peer.everyPeer((p) => {
      p.send(
        Variant.from("OnConsoleMessage", `CP:0_PL:4_OID:_CT:[SB]_ \`5**\`\` from \`$\`2${peer.name} \`\`\`\`(in \`$${world?.data.jammers?.find((v) => v.type === "signal")?.enabled ? "`4JAMMED``" : peer.data.world}\`\`) ** :\`\` \`#${args.join(" ")}`),
        TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|audio/beep.wav`, `delayMS|0`)
      );
    });
  }
}
