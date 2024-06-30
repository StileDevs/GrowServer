import { BaseServer } from "../BaseServer.js";
import { Message, type TextableChannel } from "eris";
import { handleSaveAll } from "../../utils/Utils.js";
import { Logger } from "../Logger.js";

export default async function ShutdownServer(server: BaseServer, args: string[], msg: Message<TextableChannel>) {
  const log = new Logger();
  if (msg.author.id !== process.env.DISCORD_BOT_OWNERID) return msg.channel.createMessage("Wait, Why would you do this?");

  log.action(`>> ${msg.author.username} << - executed the Shutdown command for discord bot`);
  handleSaveAll(server, true);
}
