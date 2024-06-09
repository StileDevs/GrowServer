import { BaseServer } from "../BaseServer";
import { Peer } from "../Peer";
import { TextPacket, Variant } from "growtopia.js";
import { DataTypes } from "../../utils/enums/DataTypes";
import { Message } from "discord.js";

export default async function test(server: BaseServer, args: string[], msg: Message) {
  const peer = new Peer(server, 0);

  peer.everyPeer((p) => {
    p.send(
      Variant.from("OnConsoleMessage", `Your message`),
      TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|audio/beep.wav`, `delayMS|0`)
    );
  })
}