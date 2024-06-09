import { BaseServer } from "../BaseServer.js";
import { Message } from "discord.js";
import { handleSaveAll } from "../../utils/Utils.js";
import { Logger } from "../Logger.js";

export default async function ShutdownServer(server: BaseServer, args: string[], msg: Message) {
  const log = new Logger();
  if (msg.author.id !== process.env.OWNERID) return msg.reply("Wait, Why would you do this?");

  log.action(`>> ${msg.author.username} << - executed the Shutdown command for discord bot`);
  handleSaveAll(server, true);
}
