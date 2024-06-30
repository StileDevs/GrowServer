import { BaseServer } from "../BaseServer.js";
import { Peer } from "../Peer.js";
import { TextPacket, Variant } from "growtopia.js";
import { DataTypes } from "../../utils/enums/DataTypes.js";
import { Message, type TextableChannel } from "eris";

export default async function test(server: BaseServer, args: string[], msg: Message<TextableChannel>) {
  const peer = new Peer(server, 0);

  peer.everyPeer((p) => {
    p.send(Variant.from("OnConsoleMessage", `Your message`), TextPacket.from(DataTypes.ACTION, "action|play_sfx", `file|audio/beep.wav`, `delayMS|0`));
  });
}
