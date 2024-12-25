import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { PacketTypes, TextPacket, Variant } from "growtopia.js";

export default class Sb extends Command {
  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["sb"],
      description: "Broadcast a message to everyone",
      cooldown: 5,
      ratelimit: 1,
      category: "`oBasic",
      usage: "/sb <message>",
      example: ["/sb hello"],
      permission: [ROLE.BASIC, ROLE.SUPPORTER, ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    if (!this.args.length) return this.peer.send(Variant.from("Message are required."));

    const world = this.peer.currentWorld();
    const msg = this.args.join(" ");
    const jammed = world?.data.jammers?.find((v) => v.type === "signal")?.enabled;

    const buf = Buffer.alloc(12 + msg.length + this.peer.data.tankIDName.length + this.peer.data.world.length);

    this.peer.every((p) => {
      p.send(Variant.from("OnConsoleMessage", `CP:0_PL:4_OID:_CT:[SB]_ \`5**\`\` from \`$\`2${this.peer.name} \`\`\`\`(in \`$${jammed ? "`4JAMMED``" : this.peer.data.world}\`\`) ** :\`\` \`#${msg}`), TextPacket.from(PacketTypes.ACTION, "action|play_sfx", `file|audio/beep.wav`, `delayMS|0`));
    });
  }
}
