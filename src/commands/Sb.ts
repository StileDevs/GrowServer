import { TextPacket, Variant } from "growtopia.js";
import { Command } from "../abstracts/Command.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import type { CommandOptions } from "../types";
import { Role } from "../utils/Constants.js";
import { DataTypes } from "../utils/enums/DataTypes.js";
import { BroadcastChannelsType, OpCode, RequestFlags } from "../utils/enums/WebSocket.js";

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
    const msg = args.join(" ");
    const jammed = world?.data.jammers?.find((v) => v.type === "signal")?.enabled;

    const buf = Buffer.alloc(12 + msg.length + peer.data.tankIDName.length + peer.data.world.length);

    let pos = 0;
    buf.writeInt32LE(OpCode.BROADCAST_CHANNELS);
    pos += 4;
    buf.writeUInt8(BroadcastChannelsType.SUPER_BROADCAST, pos);
    pos += 1;
    buf.writeUInt8(jammed ? 1 : 0, pos);
    pos += 1;

    buf.writeUint16LE(msg.length, pos);
    pos += 2;
    buf.write(msg, pos);
    pos += msg.length;

    buf.writeUint16LE(peer.data.tankIDName.length, pos);
    pos += 2;
    buf.write(peer.data.tankIDName, pos);
    pos += peer.data.tankIDName.length;

    buf.writeUint16LE(peer.data.world.length, pos);
    pos += 2;
    buf.write(peer.data.world, pos);
    pos += peer.data.world.length;

    this.base.wss?.server.everyUser((u) => {
      if (u.flags & RequestFlags.SUPER_BROADCAST) u.send(buf);
    });

    peer.everyPeer((p) => {
      p.send(Variant.from("OnConsoleMessage", `CP:0_PL:4_OID:_CT:[SB]_ \`5**\`\` from \`$\`2${peer.name} \`\`\`\`(in \`$${jammed ? "`4JAMMED``" : peer.data.world}\`\`) ** :\`\` \`#${msg}`), TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|audio/beep.wav`, `delayMS|0`));
    });
  }
}
