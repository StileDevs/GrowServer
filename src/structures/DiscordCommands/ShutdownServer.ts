import { BaseServer } from "../BaseServer";
import { Message } from "discord.js";
import { handleSaveAll } from "../../utils/Utils";
import { Logger } from "../Logger";

export default async function ShutdownServer(server: BaseServer, args: string[], msg: Message) {
  const log = new Logger;
  if(msg.author.id !== "591837095954350092") return msg.reply("Wait, Why would you do this?");

  log.action(`>> ${msg.author.username} << - executed the Shutdown command for discord bot`);
  handleSaveAll(server, true);
}